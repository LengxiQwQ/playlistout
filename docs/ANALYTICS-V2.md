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

## Dashboard V3 presentation rules

- The dashboard is served by a loopback-only Python proxy and contains **no third-party browser JavaScript**. Private maintainer analytics therefore cannot be read by a CDN-hosted script executing inside the localhost page.
- Single-day, non-geographic queries expose `hourlyTimeseries` from `analytics_v2_hourly_core`; multi-day queries remain daily. UTC storage order is preserved even when hour labels are converted to the browser's local timezone for display.
- Dashboard labels distinguish client IDs/categories from people or installations. Integration request cards use channel/client `resolve_request` counts rather than re-labeling all-channel totals.
- Geography filters do not affect reliability breakdowns, and platform/geography filters do not affect client-environment cubes. The UI must show these scope boundaries whenever such a partial filter is active.
- Data-quality failures show expected vs actual values, and feedback status changes require explicit confirmation.

## Production cutover and V1 retirement

Analytics V2 is the only production analytics backend.

The migration sequence is deliberately staged:

1. `0011_analytics_v2.sql` created the canonical V2 aggregate cubes and deterministically rebuilt historical data.
2. `0012_analytics_v2_cutover.sql` captured public-counter continuity baselines.
3. Deployment reconciled live V1/V2 deltas and froze the cutover.
4. `0013_freeze_analytics_v1_archive.sql` captured exact fingerprints of the seven V1 fact tables.
5. `0014_prepare_analytics_v1_retirement.sql` re-verified those fingerprints, formalized the security quarantine schema, and materialized the remaining public-history dependency into `analytics_v2_public_history` without destructive changes.
6. After the V2-only Worker was deployed and production-reconciled, `0015_retire_analytics_v1.sql` re-verified the archive and permanently dropped the seven V1 fact tables.

Public lifetime counters continue to use the continuity bridge:

```
public_total = legacy_total_at_cutover + (v2_total_now - v2_total_at_cutover)
```

For the cutover UTC day, the same bridge is applied to daily counters. Dates before the cutover are served from the compact immutable `analytics_v2_public_history` table. Dates after the cutover are served directly from V2.

The historical `analytics_v1_archive_manifest` is retained only as compact audit metadata. Recovery of the physically retired V1 tables is through D1 Time Travel / external backup, not through runtime code.

### Retired V1 fact tables

These tables no longer exist in the current production schema:

- `aggregate_stats`
- `hourly_stats`
- `daily_geo_stats`
- `daily_client_stats`
- `daily_performance_stats`
- `daily_export_stats`
- `daily_clipboard_stats`

`daily_visitor_hashes` remains an intentionally short-lived daily-UV deduplication helper and is still pruned. Security quarantine, feedback, and durable rate-limit tables also remain active because they are not V1 product analytics fact tables.

### Permanent deployment gates

Every Worker deployment now verifies:

- migration-file integrity and exact migration history
- production D1 identity
- current post-retirement schema
- Analytics V2 resolver/export/clipboard invariants
- Analytics V1 is fully retired (the seven tables must be absent)
- compact public-history metadata is consistent
- the deployed public `/api/stats` response matches the production D1 continuity bridge under concurrent traffic

A failure in any of these checks blocks deployment.

## Current maintainer surface

The former `GET /api/internal/stats` compatibility endpoint has been removed. The current authenticated Analytics V2 surface is:

- `GET /api/internal/analytics/v2` — filtered server-side aggregate query, retained for diagnostics/tests.
- `GET /api/internal/analytics/v2/snapshot` — one-shot aggregate snapshot for the local Dashboard.

Dashboard V3 is intentionally **snapshot-first and offline after startup**:

1. the loopback Python process sends one Bearer-authenticated request for the full bounded aggregate snapshot when it starts;
2. the snapshot stays only in local process memory;
3. browser page loads, date changes, platform/client/geography filters, Reliability/Security views, and Feedback list reads use localhost/in-memory data only;
4. an explicit “刷新云端数据” action performs one new snapshot request;
5. Feedback status changes remain explicit authenticated PUT operations because they mutate production state.

Neither maintainer endpoint enables browser CORS, and the admin token never enters browser HTML/JavaScript.

## Completion status

Analytics V2 + Dashboard V3 is **complete and closed** as an engineering migration.

There is no remaining V1 runtime reader, writer, private endpoint, fact table, or maintenance script. Future analytics changes should be ordinary V2 feature/maintenance work and must not reintroduce the retired TOTAL/all architecture.
