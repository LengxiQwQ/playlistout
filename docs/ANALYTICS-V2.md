# PlaylistOut Analytics V2

Analytics V2 replaces the original TOTAL/all rollup model with canonical bounded aggregates.

## Goals

1. Accurate product attribution across **Web**, **Plugin**, and **Public API** traffic.
2. Security classification is independent from product channel classification.
3. No raw IP, playlist URL/ID, credentials, cookies, full User-Agent, or per-request event log is persisted.
4. V2 tables never use `date='TOTAL'` or `platform='all'`.
5. Historical data is only rewritten when it can be reconstructed deterministically. Ambiguous historical attribution is stored as `legacy_mixed / legacy_unknown`, never guessed.
6. Dashboard queries use a bounded internal API. No arbitrary SQL is accepted from clients.

## Canonical channels

| channel | client_id | Meaning |
| --- | --- | --- |
| `web` | `official_web` | Official PlaylistOut web frontend |
| `plugin` | `musicfree` | Official MusicFree integration |
| `api` | `anonymous_api` | Public API caller without a registered integration ID |
| `internal` | `internal` | Internal health/probe traffic when explicitly recorded |
| `legacy_mixed` | `legacy_unknown` | Historical traffic that cannot be safely separated |

Client identification is analytics attribution only. It is **not authentication** and never grants security privileges.

## Canonical core metrics

- `resolve_request`
- `playlist_success`
- `user_success`
- `resolve_failure`
- `tracks_processed`
- `export`
- `clipboard`
- `page_view`
- `visitor_unique`
- `rate_limited`

Invariant for resolver traffic:

```
resolve_request = playlist_success + user_success + resolve_failure
```

## Storage model

- `analytics_v2_daily_core`: daily product counters by date/channel/client/platform/metric.
- `analytics_v2_hourly_core`: same dimensions plus UTC hour.
- `analytics_v2_geo`: approved product counters by coarse country/region. No city is stored in V2.
- `analytics_v2_breakdown`: bounded operational dimensions such as failure code, latency bucket, provider path, export format, plugin version.
- `analytics_v2_client_env`: coarse client environment only.

Every V2 table stores base facts only. Totals are computed at query time.

## Privacy boundary

V2 may correlate approved **product dimensions** (date, channel, registered client, platform) because they are necessary to answer product questions. It does not create user/session/request identities. Geography and client environment remain separate cubes from reliability dimensions, so a maintainer cannot reconstruct a single request by joining all dimensions.

## Historical migration policy

### Deterministically repair
- export totals and export-format totals
- clipboard totals and clipboard-mode totals
- redundant TOTAL/all rollups
- web page-view / daily-unique history
- platform-level parse counters
- bounded reliability dimensions

### Never guess
Historical MusicFree requests used browser-like headers and cannot be reliably distinguished from web/API traffic. Those rows are imported as:

```
channel = legacy_mixed
client_id = legacy_unknown
```

New explicit attribution begins when Analytics V2 is deployed.

## Plugin attribution headers

Registered integrations may send:

```
X-PlaylistOut-Client-Type: plugin
X-PlaylistOut-Client-Id: musicfree
X-PlaylistOut-Client-Version: 1.3.9
X-PlaylistOut-Host: android|windows|macos|linux|unknown
```

Headers are bounded and sanitized. No install ID, user ID, device ID, email, token, or other persistent identifier is allowed.

## Internal API

`GET /api/internal/analytics/v2`

Allowed filters:

- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`
- `channel=web|plugin|api|internal|legacy_mixed`
- `client=official_web|musicfree|anonymous_api|internal|legacy_unknown|unknown_plugin`
- `platform=qqmusic|netease|kugou|qishui|unknown|none`
- `country=XX`
- `region=<bounded string>`

Date range is bounded to 366 days. The endpoint is maintainer-only and does not enable browser CORS.

## Data-quality checks

The V2 response includes health checks for:

- resolver invariant
- export total vs export-format breakdown
- clipboard total vs clipboard-mode breakdown
- forbidden V2 rollup tokens (`TOTAL`, `all`)
- latest recorded day
- legacy mixed share

A failed invariant is surfaced as a dashboard data-integrity warning.
