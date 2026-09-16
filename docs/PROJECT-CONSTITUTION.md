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

## 2. MVP Scope

The MVP supports **QQ Music only**.

The MVP must support public QQ Music playlist URLs and extract at minimum:

- playlist name
- creator/display name when available
- track order
- track title
- artist(s)
- album

Optional metadata may also be preserved internally when reliably available, including:

- playlist ID
- track ID
- duration
- source URL
- cover URL

The MVP must allow local browser-side export to:

- TXT
- CSV
- XLSX
- JSON

The MVP should also support convenient copy actions such as:

- title only
- `title - artist`
- `title - artist - album`

### Explicit MVP non-goals

Do not add any of the following unless a later roadmap phase explicitly approves it:

- user registration or login
- PlaylistOut user accounts
- QQ Music login
- QR-code login
- private playlists
- cookie import
- cloud sync
- server-side file storage
- music playback
- music downloading
- lyrics downloading
- comments/social features
- recommendations
- AI features
- payments or subscriptions
- ad systems
- Spotify/Apple Music migration
- admin dashboards
- generic web scraping/proxy services

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

- No application database is required for playlist content.
- Cloudflare D1 may be used only for minimal aggregated usage statistics unless this constitution is explicitly changed.
- Cloudflare Web Analytics may be used for site traffic analytics.

### Legacy CLI

The existing Python QQ Music exporter remains part of the repository as a CLI/legacy implementation and technical reference.

It must not be silently deleted during the web transition.

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

- generate XLSX/CSV/TXT files
- store exported files
- store playlist contents
- store song lists
- maintain user accounts
- become a general-purpose HTTP proxy

---

## 5. Provider Architecture

Every music platform must be isolated behind a provider implementation.

MVP provider:

- `qqmusic`

Future providers may include:

- `netease`
- `kugou`
- `kuwo`
- `migu`
- `qishui`

Adding a provider must not require redesigning the frontend or the normalized playlist model.

Conceptually, every provider must implement the same responsibilities:

1. validate/recognize input relevant to its platform
2. extract or validate the playlist identifier
3. fetch source playlist metadata and tracks
4. handle pagination
5. normalize source fields
6. verify expected completeness when possible
7. return the shared PlaylistOut model
8. fail clearly and safely when source data cannot be trusted

Provider-specific source shapes must not leak into generic frontend components.

---

## 6. Normalized Data Contract

The normalized model must be platform-independent from the beginning, even while QQ Music is the only MVP provider.

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
  id?: string;
  title: string;
  artists: string[];
  album?: string;
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

If analytics are enabled, only aggregate usage information should be stored, such as:

- date
- platform
- successful parse count
- failed parse count

Playlist contents are transient processing data and must not become a server-side dataset.

No telemetry system may be added silently.

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

Two analytics categories are allowed.

### Site traffic

Cloudflare Web Analytics may measure site-level traffic such as page views and visitors.

### Product usage

D1 may record aggregated parse counters by date/platform/result.

A parse should only count as successful after the playlist response has passed the provider's success/completeness checks.

Do not use analytics as an excuse to persist playlist content.

---

## 10. Repository Direction

PlaylistOut is a monorepo containing the website, Worker, legacy CLI, documentation, and automation.

Target structure:

```text
playlistout/
├── web/
│   └── ... React + TypeScript + Vite
├── worker/
│   └── ... Cloudflare Worker + providers
├── cli/
│   └── qqmusic/
│       └── ... existing Python exporter
├── docs/
│   ├── PROJECT-CONSTITUTION.md
│   └── ROADMAP.md
├── .github/
│   └── workflows/
├── README.md
└── LICENSE
```

The exact internal subfolders may evolve, but the top-level separation between `web`, `worker`, `cli`, and `docs` should remain clear.

---

## 11. Legacy Python Rules

The existing QQ Music Python implementation is valuable because it contains proven request paths, fallback behavior, normalization logic, and CLI functionality.

During migration:

- preserve git history through normal moves where possible
- relocate the old Python tool under `cli/qqmusic/`
- keep its dependencies and tests functional
- preserve or relocate its existing README information
- do not make the new Worker import or execute Python
- use the Python implementation as behavioral reference, not as a hidden runtime backend

The web MVP and Python CLI may coexist with different implementations as long as they share expected behavior for supported QQ Music data.

---

## 12. Testing and Acceptance Philosophy

"Code exists" is not completion.

"Tests pass" is not sufficient if tests only validate mocks.

Every production-facing provider phase must include real-world validation against public playlists.

For QQ Music MVP, final validation must include representative public playlists such as:

- small playlist
- medium playlist
- large playlist / pagination case
- multi-artist tracks
- Chinese titles
- English titles
- Japanese/Korean or other Unicode text where available
- special characters
- missing optional album/metadata cases where available

Acceptance must verify at minimum:

- playlist identity
- track count
- track order
- track title
- artist(s)
- album where source provides it
- export correctness
- error behavior

Mock tests are useful but cannot replace real-source acceptance tests.

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
