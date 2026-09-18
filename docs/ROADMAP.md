# PlaylistOut Roadmap

> Read together with [`PROJECT-CONSTITUTION.md`](./PROJECT-CONSTITUTION.md). The constitution defines the long-term product, architecture, privacy, and security boundaries. This file describes the **current** direction after the QQ Music MVP was completed.

## Current status

**PlaylistOut v2.0.0 — QQ Music Web MVP: COMPLETE**

The original P0–P9 delivery roadmap has finished and is now treated as historical release documentation. Do not reopen those phases for ordinary bug fixes or compatibility work.

The complete v2.0.0 MVP roadmap is permanently preserved in the release tag:

- [Archived v2.0.0 MVP Roadmap](https://github.com/LengxiQwQ/playlistout/blob/v2.0.0/docs/ROADMAP.md)
- [v2.0.0 Release](https://github.com/LengxiQwQ/playlistout/releases/tag/v2.0.0)
- [Documentation archive index](./archive/README.md)

The current production baseline includes:

- public QQ Music playlist parsing
- normalized platform-independent playlist data
- bounded pagination including 1000+ track playlists
- TXT / CSV / XLSX / JSON browser-local export
- clipboard copy modes
- anonymous aggregate usage statistics
- abuse/security boundaries
- responsive web UI, privacy information and SEO metadata
- GitHub Pages + Cloudflare Worker + D1 production deployment
- preserved Python QQ Music CLI

---

# 1. Maintenance lane — v2.0.x

Small fixes after v2.0.0 belong here rather than reopening P0–P9.

Typical work:

- QQ Music upstream compatibility fixes
- additional QQ Music URL/share-link compatibility
- browser-specific fixes
- UI/UX bug fixes
- export edge cases
- dependency/security maintenance
- performance improvements that do not change product scope
- documentation corrections

Maintenance rules:

- preserve the normalized data contract unless a deliberate compatible extension is required
- preserve legitimate duplicate playlist entries
- keep fail-closed behavior for incomplete/untrustworthy source data
- keep export generation local to the browser
- keep privacy and outbound-host restrictions intact
- add regression tests for every reproducible bug where practical

Compatibility fixes are normal maintenance. They do **not** mean the v2.0.0 MVP was incomplete.

---

# 2. Analytics Foundation — next backend milestone

## Objective

Build a small, privacy-conscious analytics backend that can support future public statistics and private product insights without redesigning the frontend later.

This milestone is backend/data only. Do **not** redesign the website UI, build maps, create an admin dashboard, or add a user-account system here.

## 2.1 Public statistics model

Prepare aggregate data that may later be shown on the public website:

- project launch date (`launchedAt`; this is the product launch date, not Worker process uptime)
- total successful playlists parsed
- playlists parsed today
- total tracks processed
- tracks processed today
- total exports
- exports today
- successful parses by platform
- optional recent daily trend data (for example last 7/30 days)

`/api/stats` should remain public-safe and expose aggregate values only.

## 2.2 Private product-insight model

Prepare aggregate/private data for the maintainer to inspect later. This data is **not** shown on the public website by default.

Useful dimensions include:

- date and coarse hour bucket
- country
- first-level region/state/province when available
- platform (`qqmusic`, later other providers)
- input type (web URL / mobile share link / raw ID / other supported form)
- parse result and stable error category
- playlist-size bucket (for example `1-50`, `51-200`, `201-500`, `501-1000`, `1000+`)
- track count totals
- export format (TXT / CSV / XLSX / JSON)
- clipboard mode usage
- coarse device class (desktop / mobile / tablet)
- coarse browser family and OS family when practical
- latency bucket
- provider path information useful for reliability analysis (for example primary / fallback)
- rate-limit / upstream / timeout / internal-error counters

Where Cloudflare Web Analytics already provides suitable page-view/referrer/visitor information, prefer using it instead of duplicating detailed web-traffic tracking in D1.

## 2.3 Privacy boundary

Do not store raw per-user event histories merely for convenience.

Never persist:

- raw IP addresses
- precise latitude/longitude
- postal code
- street/address information
- playlist URLs
- playlist IDs as user history
- song/artist/album content
- cookies or authentication data
- full User-Agent strings when a coarse parsed category is enough
- complete referrer URLs with path/query data

If request geography is used, derive the coarse country/region at request time and store only the intended aggregate dimension. The raw IP must not be written to D1.

Prefer daily/hourly aggregate counters over long-lived event-level tracking whenever the same insight can be obtained from aggregates.

## 2.4 Backend structure

The implementation should stay small:

- extend D1 through normal migrations
- keep current aggregate statistics working during migration
- separate public statistics from private analytics logically in code/schema
- provide one stable public stats read contract
- do not expose private geography/device/error breakdowns through an unauthenticated public endpoint
- if private viewing is needed later, use direct D1/Cloudflare access first; build an authenticated admin surface only when there is a real need
- analytics writes remain best-effort and must never break playlist parsing or exporting
- keep provider-facing production code independent from analytics storage details where practical

Frontend events such as export-format or clipboard usage may be wired later during the UI redesign. This milestone should define the backend contract/schema so those events can be added without another data-model rewrite.

## 2.5 Acceptance gate

This milestone is complete when:

- D1 migrations cleanly support the new public/private aggregate model
- existing parse statistics continue to work
- `/api/stats` returns a stable public-safe response
- successful parses and processed-track totals are counted correctly
- export/interaction event ingestion has a defined safe contract, even if the redesigned frontend has not wired every event yet
- no prohibited identifying/raw playlist data is stored
- analytics failure cannot change parse/export success
- tests cover aggregation, privacy boundaries, malformed events, and D1 failure behavior
- production migration/deployment succeeds

> **Status (Milestones R1–R7 COMPLETE)**:
> - R1–R5: Authenticity, verification, semantic consistency, client event trust boundary, and referrer minimization are verified and closed.
> - R6: **Public / Private Analytics Split is COMPLETE**. Public product statistics (`/api/stats`) strictly decoupled from maintainer-only diagnostic insights (`/api/internal/stats` with Bearer auth). Zero private dimensions leak to unauthenticated endpoints or public GitHub snapshots.
> - R7: **Resolve Failure Telemetry is COMPLETE**. Bounded, privacy-preserving aggregate telemetry for universal resolver outcomes (`/api/v1/resolve`), platform operational failure attribution, provider primary/fallback failure path tracking, disambiguation stage telemetry, and failure rate visualization in maintainer dashboard. Zero raw query, URL, ID, token, or error message persistence. Silent internal probes preserve metric fidelity.

---

# 3. Provider expansion lane

The next major product step after the analytics foundation is adding more music-platform providers behind the existing normalized contract.

Recommended order unless later research changes the priority:

1. NetEase Cloud Music
2. Kugou Music
3. Kuwo Music
4. Migu Music
5. Qishui Music

Each provider should be developed as its own scoped milestone. Do not implement several providers at once merely to claim broad compatibility.

For every new provider:

- recognize and validate only supported public playlist inputs
- use explicit allowlisted upstream endpoints
- handle pagination/completeness deliberately
- normalize into the existing shared `Playlist` / `Track` model
- preserve source order and legitimate duplicate entries
- fail clearly when source data cannot be trusted
- add deterministic tests plus real public-playlist validation
- connect to the existing frontend without leaking provider-specific raw fields
- keep analytics aggregate-only

A provider is not considered supported merely because one sample playlist works.

---

# 4. Product improvements — later / optional

These are possible future improvements, not current commitments:

- M3U / M3U8 export
- selectable export fields
- client-side search/filter for parsed tracks
- batch playlist parsing
- richer but still aggregate public statistics
- direct platform-to-platform migration where technically and legally appropriate

Do not add these opportunistically during unrelated maintenance work. Promote an item into an explicit milestone first.

---

# 5. Release and validation rules

For ordinary fixes:

1. reproduce the issue when possible
2. implement the smallest correct fix
3. add/update tests
4. run relevant Web / Worker / Python CLI checks
5. push to `main`
6. confirm affected CI/deployment workflows succeed

For provider additions or major behavior changes:

- define a scoped roadmap/milestone before implementation
- include real-source validation, not mocks alone
- verify the production path end-to-end before declaring support
- update README/API/privacy documentation when user-visible behavior changes

Git tags and GitHub Releases are useful milestone snapshots, but continuous website deployment remains the normal delivery model.

---

# 6. Historical roadmap policy

Completed delivery plans should be treated as release history, not kept indefinitely as active task lists.

The v2.0.0 P0–P9 roadmap is frozen at the `v2.0.0` tag. Future completed major roadmaps should be archived the same way so `docs/ROADMAP.md` always describes what comes next rather than what has already shipped.
