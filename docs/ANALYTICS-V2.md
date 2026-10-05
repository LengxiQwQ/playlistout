# PlaylistOut Analytics V2 Specification

> Status: normative specification for the Analytics V2 rebuild.
> Storage timezone: UTC. Display timezone is a presentation concern.
> Privacy model: aggregate-first, no raw user history.

## 1. Goals

Analytics V2 provides one coherent source of truth for product usage, integrations, reliability, and security while preserving PlaylistOut's privacy boundary.

The system MUST:

- distinguish official Web, first-party/partner plugins, public API callers, and internal traffic;
- keep product channel classification separate from security/trust classification;
- make every metric definition explicit and testable;
- support date-range, channel, client, platform, country, and region filtering;
- keep UTC as the canonical storage timezone and expose timestamps/buckets that can be rendered in any display timezone;
- avoid synthetic `date = 'TOTAL'` and `platform = 'all'` rows in V2 fact tables;
- preserve V1 tables during migration until V2 has passed reconciliation and production validation;
- rebuild historical V2 data only from facts that can be derived deterministically from V1;
- mark unverifiable historical attribution as `legacy_mixed` / `legacy_unknown` instead of guessing.

## 2. Non-goals

Analytics V2 MUST NOT become per-user tracking. It does not store raw IP addresses, precise coordinates, full User-Agent strings, playlist URLs/IDs, track metadata, cookies, platform auth credentials, or stable cross-day user identifiers.

## 3. Request identity model

### 3.1 Product channel

Every product request belongs to exactly one product channel:

- `web` — official PlaylistOut web application;
- `plugin` — a declared player integration such as MusicFree or future Moosync integrations;
- `api` — public API usage that is not an identified plugin;
- `internal` — maintainer/internal operations that are intentionally excluded from product KPIs;
- `legacy_mixed` — historical-only attribution for V1 data that cannot be separated safely.

### 3.2 Client ID

Examples:

- `official_web`
- `musicfree`
- `moosync`
- `anonymous_api`
- `legacy_unknown`

Client IDs are analytics labels, not authentication claims.

### 3.3 Trust/security class

Security classification is orthogonal to product channel:

- `attested` — official web session attestation validated by the server;
- `declared` — client self-identifies using bounded analytics headers;
- `untrusted` — normal public API request without attestation;
- `automated` — likely automation/crawler activity;
- `abusive` — traffic that actually crosses a server-side abuse boundary.

`api` does not imply malicious traffic. `plugin` does not imply trusted traffic. Analytics client headers MUST NEVER grant authentication, authorization, or a higher rate limit by themselves.

## 4. Canonical request context

Request metadata is classified once near the request boundary and then passed into all analytics recorders.

Canonical fields:

- UTC date and hour bucket
- `channel`
- `client_id`
- optional bounded `client_version`
- optional bounded `host_platform`
- `trust_class`
- coarse `country`, `region`, optional `city`
- coarse device/browser/OS classification when meaningful

All downstream metrics for the same request MUST reuse the same context rather than independently reclassifying headers.

## 5. Core metric definitions

### 5.1 Resolve

- `resolve_request`: one authoritative completed invocation of the universal resolver.
- `playlist_success`: final result is a playlist.
- `user_success`: final result is a user profile/listing.
- `resolve_failure`: final resolver outcome is failure.

Invariant:

`resolve_request = playlist_success + user_success + resolve_failure`

Internal disambiguation probes MUST NOT increment these counters.

### 5.2 Playlist processing

- `tracks_processed`: sum of tracks returned by successful playlist resolutions/parses.
- `parse_success`: successful direct single-playlist parse when the endpoint semantics are a playlist parse.
- `parse_failure`: terminal direct playlist parse failure.

Universal resolve and direct playlist endpoints MUST NOT accidentally count one request twice as two independent product requests. The API layer defines the authoritative request metric; lower-level provider probes remain silent.

### 5.3 Web

- `page_view`: accepted official web visit event.
- `daily_unique`: a daily-only anonymous unique visitor derived server-side; no cross-day identity.

### 5.4 Export and clipboard

- `export`: one user-triggered file export.
- `clipboard`: one user-triggered clipboard action.

Invariant:

`export_total = SUM(export_format counts)` for the same filter scope.

`clipboard_total = SUM(clipboard_mode counts)` for the same filter scope.

### 5.5 Reliability/security

- `rate_limited`: a request actually rejected with HTTP 429.
- failure dimensions use bounded enums only.
- security quarantine is an incident/forensic store and is not a replacement for normal product analytics.

## 6. Storage rules

V2 fact tables store real dimensional facts only. They MUST NOT persist rollup sentinel rows such as:

- `date = 'TOTAL'`
- `platform = 'all'`

Totals are derived using `SUM` at query time. If a future performance optimization requires materialized rollups, those rollups must live in a clearly separate cache/materialized table and never share the same schema as facts.

## 7. Historical migration policy

Historical data is classified into three groups:

1. **Deterministically rebuildable** — rebuild from V1 source rows (for example platform-specific export rows).
2. **Derivable rollups** — discard V1 `TOTAL`/`all` sentinels and recompute from real rows.
3. **Not attributable** — record as `legacy_mixed`/`legacy_unknown`; never infer plugin vs web vs API without evidence.

Historical rebuild scripts MUST be idempotent, produce reconciliation output, and fail closed when invariants do not hold.

## 8. Internal query contract

The V2 maintainer API accepts bounded filters only:

- `from`, `to`
- `channel`
- `client`
- `platform`
- `country`
- `region`
- bounded `groupBy` values defined by the server

It never accepts arbitrary SQL fragments.

## 9. Dashboard information architecture

Dashboard V3 is organized by user question rather than by raw table:

- **Overview** — health and product KPIs
- **Web** — PV/UV, acquisition, device and web feature usage
- **Integrations** — plugin/API adoption, versions, hosts, platform mix
- **Reliability** — success/failure, latency, provider path, error taxonomy
- **Security** — automation, 429s, quarantine and incidents
- **Feedback** — user-reported parse failures and triage

A single global filter bar controls date range, channel, client, platform, country, region and display timezone.

## 10. Data quality gates

CI and runtime diagnostics must verify at least:

- resolve outcome invariant;
- export total equals format breakdown;
- clipboard total equals mode breakdown;
- no V2 `TOTAL` or `all` sentinel rows;
- no raw IP, playlist URL/ID, credential, full UA, or raw exception text in V2 analytics tables;
- migration history remains sequential and immutable;
- historical rebuild is idempotent.

A failed data-quality invariant is an analytics integrity error, not a visualization issue.
