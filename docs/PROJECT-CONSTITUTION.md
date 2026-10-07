# PlaylistOut Project Constitution

> This document defines the non-negotiable product, architecture, privacy, security, and implementation rules for PlaylistOut. All future roadmap items, AI-generated changes, pull requests, and refactors must follow it unless this document is explicitly revised first.

## 1. Project Identity

**Project name:** PlaylistOut  
**Primary domain:** `playlistout.lengxiqwq.com`  
**Repository:** `LengxiQwQ/playlistout`

PlaylistOut is a lightweight, privacy-friendly web tool for exporting public music playlists into structured data files.

The core user journey is intentionally simple:

1. Open PlaylistOut.
2. Paste a supported public playlist URL.
3. Parse the playlist.
4. Preview structured track data.
5. Export or copy the data.

The product principle is:

> **Paste. Parse. Export.**

PlaylistOut is not a music player, downloader, streaming service, account system, or full music-migration SaaS.

---

## 2. Current Production Scope

The original QQ Music-only Web MVP shipped with v2.0.0 and is release history. The current production baseline is the v2.2.x maintenance line.

Current supported product capabilities are:

- public playlist parsing for **QQ Music**, **NetEase Cloud Music**, **KuGou Music**, and **QiShui Music**
- public user-playlist discovery where a provider exposes a supported, trustworthy path
- browser-local TXT / CSV / XLSX / JSON / M3U8 export
- clipboard copy workflows
- Public API v1 for third-party applications, scripts, and migration tools
- the MusicFree integration plugin plus a small interoperability lane for other open-source players
- privacy-preserving aggregate Analytics V2 for public statistics and maintainer diagnostics

The product principle remains:

> **Paste. Parse. Export. Keep moving.**

### Explicit non-goals & boundaries

Do not add any of the following unless a later roadmap phase explicitly approves it:

- PlaylistOut user registration, passwords, or user databases
- server-side persistence of music-platform credentials or auth tokens
- permanent user tracking or cross-day fingerprinting
- cookie imports or session hijacking
- cloud synchronization or server-side export-file hosting
- music streaming/playback or media-file downloading
- lyrics scraping or audio extraction
- social features, comments, or algorithmic recommendations
- commercial monetization, payments, or ads
- generic proxy or scraping services
- direct platform-to-platform migration merely to duplicate mature existing tools without a concrete interoperability need

Third-party platform authentication is allowed only when required to access content the user is already authorized to view. KuGou optional QR authorization is the current example: credentials stay in the user's browser, are transmitted only in request headers when needed for the upstream request, and must never be persisted to D1, analytics, logs, or repository files.

---

## 3. Locked Technical Direction

The initial architecture is fixed as follows.

### Frontend

- React
- TypeScript
- Vite
- static deployment
- GitHub Pages as the initial frontend hosting target
- custom domain: `playlistout.lengxiqwq.com`

Do not replace this with Next.js, Nuxt, SSR, a Node server, or another full-stack framework without first revising this constitution.

### API / Network layer

- Cloudflare Workers
- TypeScript
- public API domain target: `playlistout-api.lengxiqwq.com`

The Worker exists only because browsers cannot reliably request every music-platform endpoint directly due to CORS, protected headers, signing rules, or platform-specific restrictions.

### Database / analytics

- No application database is allowed for persisted playlist or track content.
- Cloudflare D1 may store only privacy-preserving aggregate Analytics V2 data and bounded operational state required for rate limiting, security quarantine, feedback workflow, migration metadata, or short-lived daily-visitor deduplication.
- Raw playlist/song content, credentials, raw IP addresses, complete User-Agent strings, and cross-day user identities must never be persisted.
- Analytics V2 is the only production analytics backend. Public statistics and maintainer-only analytics remain separate contracts.
- Cloudflare Web Analytics may be used for site-level traffic where it avoids duplicating detailed tracking in D1.

### Python CLI

The QQ Music and NetEase Cloud Music Python exporters remain first-class standalone tools and technical references.

They must stay independently testable and must never become a hidden runtime dependency of the Worker.

---

## 4. Architectural Boundary

The system must preserve a strict separation of responsibilities.

### Browser / frontend responsibilities

The frontend is responsible for:

- URL input and validation UX
- platform identification UX
- calling PlaylistOut API endpoints
- loading/error/success states
- rendering playlist metadata and track tables
- sorting/filtering/searching when later required
- TXT generation
- CSV generation
- XLSX generation
- JSON generation
- M3U8 generation
- clipboard copy operations
- downloads directly to the user's device

The frontend must **not** directly depend on unstable platform-specific response shapes.

It consumes only PlaylistOut's normalized API model.

### Cloudflare Worker responsibilities

The Worker is responsible for:

- validating the requested platform and playlist identifier
- invoking only approved music-platform endpoints
- handling required platform headers/request formats
- pagination when needed
- parsing platform-specific responses
- detecting incomplete or invalid responses
- converting source data into the normalized PlaylistOut model
- returning structured JSON
- recording minimal anonymous aggregate counters when enabled

The Worker must **not**:

- generate XLSX/CSV/TXT/JSON/M3U8 files
- store exported files
- store playlist contents
- store song lists
- maintain user accounts
- become a general-purpose HTTP proxy

---

## 5. Provider Architecture

Every music platform must be isolated behind a provider implementation.

Current production providers:

- `qqmusic`
- `netease`
- `kugou`
- `qishui`

Possible future providers such as Kuwo or Migu may be added only when there is a concrete user or integration need. Provider count is not a product goal.

Adding or maintaining a provider must not require redesigning the frontend or normalized playlist model.

Every provider must:

1. recognize and validate only inputs it intentionally supports
2. extract or validate provider identifiers
3. fetch only allowlisted upstream endpoints
4. use bounded pagination and explicit completeness checks
5. normalize source fields into the shared PlaylistOut model
6. preserve original track order and legitimate duplicates
7. fail clearly and safely when source data cannot be trusted
8. include deterministic regression tests and real-source validation for production-facing changes

Provider-specific source shapes must not leak into generic frontend components or public API consumers.

---

## 6. Normalized Data Contract

The normalized model must remain platform-independent across all current and future providers.

A playlist should conceptually contain:

```ts
interface Playlist {
  platform: string;
  id: string;
  name: string;
  creator?: string;
  coverUrl?: string;
  trackCount: number;
  tracks: Track[];
}

interface Track {
  index: number;
  title: string;
  artist: string;
  album?: string;
  id?: string;
  durationMs?: number;
  sourceUrl?: string;
}
```

Exact implementation details may evolve, but the following invariants must remain:

- track order is explicit
- multiple artists are represented correctly
- UI/export code is platform-neutral
- missing optional metadata is represented safely, not fabricated
- source data must never be silently replaced with guessed values

---

## 7. Privacy Rules

PlaylistOut is privacy-first by design.

The application must not persist:

- playlist URLs
- playlist IDs as user-history records
- song titles
- artist names
- album names
- exported files
- QQ numbers
- login cookies
- account credentials
- user profiles

Analytics may store only bounded, privacy-preserving aggregate or short-lived helper data needed for documented product/operational questions. Approved dimensions include date/hour buckets, product channel/client category, platform, coarse geography, bounded failure/latency categories, export/copy format, and coarse client environment.

Playlist contents are transient processing data and must not become a server-side dataset. Raw IP addresses, full referrer URLs, complete User-Agent strings, raw queries, playlist/song identifiers as user history, and persistent user/device identifiers are prohibited.

No telemetry system or new dimension may be added silently. New analytics must document its purpose, privacy boundary, retention model, and public/private exposure before deployment.

Raw D1 exports/backups must never be committed to the public repository. Production recovery uses D1 Time Travel and/or private external backups; public repository fixtures must contain only synthetic or explicitly public-safe data.

---

## 8. Security Rules

### No arbitrary proxying

The API must never expose an endpoint equivalent to:

```text
/proxy?url=<arbitrary-user-controlled-url>
```

Users must not be able to make PlaylistOut Workers fetch arbitrary hosts.

Provider code must use an explicit allowlist of expected upstream domains and internally construct upstream requests.

### Input validation

- validate playlist IDs and expected URL shapes
- reject unsupported platforms cleanly
- apply reasonable input-length limits
- never execute user-provided code or templates

### Outbound requests

- use timeouts where supported
- use bounded pagination
- cap response size / track count reasonably
- fail closed when upstream responses are malformed or unexpectedly incomplete

### Abuse control

Rate limiting may be added at the Worker/Cloudflare layer.

It should protect the free infrastructure without collecting unnecessary personal data.

---

## 9. Analytics Rules

Analytics must remain useful without becoming user tracking.

### Public product statistics

`GET /api/stats` / `GET /api/v1/stats` may expose only public-safe aggregate product counters and recent aggregate trends. It must not leak maintainer-only geography, environment, security, or failure-diagnostic dimensions.

### Maintainer Analytics V2

The maintainer Analytics V2 surface consists of the Bearer-authenticated, no-browser-CORS filtered query endpoint (`/api/internal/analytics/v2`) and its one-shot snapshot companion (`/api/internal/analytics/v2/snapshot`). Dashboard V3 must use the snapshot path for normal viewing: one cloud fetch at local-process startup (or explicit manual refresh), followed by local in-memory filtering. Routine date/tab/filter navigation must not consume additional Worker requests.

Analytics V2 stores bounded aggregate cubes. It must not introduce request/session/user identities merely to make dimensions joinable. Geography, environment, and reliability data may intentionally remain separate privacy cubes; the dashboard must explain filter-scope boundaries instead of fabricating correlations.

### Security and operational state

Rate-limit state, security quarantine, migration audit metadata, feedback workflow state, and short-lived daily visitor hashes may exist in D1 only within their documented bounded purpose and retention rules. They must not become a shadow playlist/user history.

A parse is counted as successful only after provider success/completeness checks pass. Analytics failures must never change the success or failure of the user's playlist/export action.

---

## 10. Repository Direction

PlaylistOut is a monorepo containing the website, Worker, standalone CLIs, player integrations, documentation, analytics maintenance tooling, and automation.

Current top-level structure:

```text
playlistout/
├── web/                  # React + TypeScript + Vite frontend
├── worker/               # Cloudflare Worker API + D1 migrations/providers
├── cli/
│   ├── qqmusic/          # standalone Python exporter
│   └── netease/          # standalone Python exporter
├── plugins/
│   └── musicfree/        # MusicFree integration
├── docs/                 # API/data contracts/governance/roadmap
├── insights/             # public-safe repository traffic snapshots only; never raw D1 dumps
├── scripts/              # build, CI, D1, dashboard, maintenance tools
├── .github/workflows/    # CI, Pages, Worker, repository insights
├── README.md
└── LICENSE
```

The exact internal subfolders may evolve, but the top-level separation between product surfaces, provider/runtime code, CLIs, integrations, documentation, and maintenance tooling should remain clear.

---

## 11. Python CLI Rules

The standalone QQ Music and NetEase Cloud Music Python implementations are useful independent user tools and behavioral references.

Rules:

- keep their dependencies, tests, and READMEs functional
- preserve CLI-specific behavior unless deliberately changed
- do not make the Worker import, execute, or shell out to Python
- use CLI implementations as behavioral references, not hidden production backends
- do not assume Web export schemas and CLI export schemas are identical unless explicitly documented and tested

Web, Public API, plugins, and Python CLIs may evolve independently as long as user-visible claims in README/docs match the real supported behavior.

---

## 12. Testing and Acceptance Philosophy

"Code exists" is not completion.

"Tests pass" is not sufficient if tests only validate mocks.

Every production-facing provider phase must include real-world validation against public playlists.

For every production provider or major provider change, validation should include representative real public playlists covering the cases relevant to that provider, including where practical:

- small and medium playlists
- large playlist / pagination cases
- multi-artist tracks
- multilingual and Unicode titles
- special characters
- legitimate duplicate entries
- missing optional metadata
- provider-specific partial/authenticated paths when supported

Acceptance must verify at minimum:

- playlist identity
- track count
- track order
- track title
- artist(s)
- album where source provides it
- export correctness
- error behavior

Mock tests are useful but cannot replace real-source acceptance tests for production-facing provider support. Dependency advisories must also be evaluated by reachability; an accepted advisory must have a documented boundary and a regression/policy check preventing the vulnerable code path from becoming reachable without review.

---

## 13. Failure Behavior

PlaylistOut must prefer a clear error over silently producing incomplete exports.

Examples of acceptable failures:

- unsupported URL
- playlist not public or unavailable
- source platform response changed
- upstream request timed out
- pagination could not complete
- returned track count is inconsistent and cannot be reconciled

The UI should explain failures in normal user language without exposing internal secrets or stack traces.

---

## 14. Simplicity Rule

PlaylistOut should remain small and understandable.

Do not introduce infrastructure merely because it is common in larger SaaS products.

Specifically avoid without demonstrated need:

- microservices
- Kubernetes
- Redis
- queues
- ORM layers
- server-side rendering
- complex global state managers
- account/auth frameworks
- heavyweight backend frameworks

Prefer the smallest architecture that correctly solves the current roadmap phase.

---

## 15. AI / Contributor Working Rules

Any AI agent or contributor working on PlaylistOut must:

1. Read this constitution and `ROADMAP.md` before changing production code.
2. Inspect existing implementation before proposing replacements.
3. Stay within the current roadmap phase.
4. Avoid adding unrequested features.
5. Preserve existing working functionality unless the phase explicitly replaces it.
6. Never claim a phase complete without evidence matching its acceptance criteria.
7. Clearly distinguish mocks, unit tests, integration tests, and real-source validation.
8. Update documentation when architectural behavior changes.
9. Never silently change the locked technology stack.
10. Stop and document a blocker rather than inventing fake compatibility or fabricating success.

---

## 16. Change Control

If future requirements conflict with this constitution, do not work around it implicitly.

First revise this document deliberately, record why the architecture/product boundary changed, and then update the roadmap.

Until then, this document is the source of truth for PlaylistOut's product and architectural direction.
