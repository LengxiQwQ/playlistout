# PlaylistOut Roadmap

> Read together with `PROJECT-CONSTITUTION.md`. The constitution defines the non-negotiable boundaries. This roadmap defines the delivery order and acceptance gates.

## Goal

Deliver a production-ready MVP of PlaylistOut for **public QQ Music playlists only**.

The MVP user flow is:

1. Open `playlistout.com`.
2. Paste a public QQ Music playlist URL.
3. Parse the playlist.
4. Preview playlist metadata and tracks.
5. Export locally as TXT / CSV / XLSX / JSON or copy formatted text.

The MVP is complete only when the full path works reliably against real QQ Music playlists and is deployed through the intended infrastructure.

---

# Phase 0 — Repository & Infrastructure Foundation

## Objective

Transform the existing single-purpose QQ Music Python repository into the PlaylistOut monorepo without deleting the existing CLI implementation.

## Required work

- Move the existing Python QQ Music exporter into `cli/qqmusic/`.
- Move its Python dependencies/tests/documentation with it.
- Preserve CLI behavior.
- Replace the root README with a PlaylistOut project-level README.
- Initialize `web/` as React + TypeScript + Vite.
- Initialize `worker/` as a Cloudflare Worker TypeScript project.
- Create clean shared repository conventions.
- Update `.gitignore` for Node/Vite/Cloudflare/Python artifacts.
- Rework CI so the repository can validate:
  - Python CLI
  - web TypeScript/build
  - Worker TypeScript/build/tests
- Prepare GitHub Pages deployment workflow for the `web` build.
- Prepare Worker configuration for Cloudflare deployment, but do not invent secrets.
- Document required external/manual setup steps clearly.
- Do not implement full QQ provider behavior yet beyond a minimal health/API skeleton if required for validation.

## Target top-level structure

```text
playlistout/
├── web/
├── worker/
├── cli/
│   └── qqmusic/
├── docs/
├── .github/
├── README.md
└── LICENSE
```

## Acceptance gate

P0 is accepted only if:

- old QQ Python CLI still runs/tests from its new location
- web dependencies install cleanly
- web development server starts
- web production build succeeds
- Worker development/build checks succeed
- CI references the new paths correctly
- repository root no longer looks like a QQ-only Python script project
- no legacy file was silently lost
- no unnecessary backend/server/database framework was introduced
- documentation accurately describes what still requires manual Cloudflare/GitHub configuration

---

# Phase 1 — Shared Data Contract & QQ Provider Core

## Objective

Implement a real QQ Music provider in the Worker and return PlaylistOut's normalized playlist model.

## Required work

- Define normalized `Playlist` / `Track` TypeScript contracts.
- Implement QQ playlist ID extraction and input validation.
- Port/reimplement the proven request behavior from the Python CLI into the Worker.
- Preserve useful fallback logic where still valid.
- Handle QQ response encoding/field differences deliberately.
- Implement pagination or bounded retrieval for large playlists.
- Normalize:
  - playlist ID
  - playlist name
  - creator when available
  - cover when available
  - track count
  - track order
  - title
  - artist list
  - album
  - duration when available
  - track/source IDs when available
- Return explicit typed errors for unsupported/invalid/unavailable playlists.

## Required tests

- unit tests for URL / ID parsing
- response-normalization tests using fixtures
- malformed upstream-response tests
- pagination tests
- real public QQ Music playlist validation

## Acceptance gate

P1 is accepted only if real QQ Music public playlists produce complete normalized results with verified order/count/title/artist/album behavior.

Mocks alone are not acceptance evidence.

---

# Phase 2 — API Contract & Reliability

## Objective

Make the Worker API stable, safe, bounded, and suitable for frontend consumption.

## Required work

- Establish versioned or clearly stable playlist parse endpoint(s).
- Reject arbitrary proxy URLs.
- Restrict upstream calls to QQ Music allowlisted endpoints.
- Validate request shape and limits.
- Add bounded request timeout/error handling.
- Add response-size/track-count sanity limits.
- Add CORS rules specifically for approved PlaylistOut frontend origins and local development.
- Define stable error codes/messages for frontend mapping.
- Add basic health endpoint only if genuinely useful.

## Acceptance gate

- API cannot be used as a generic proxy.
- invalid requests fail safely.
- upstream failures do not return fabricated partial success.
- frontend can consume one stable normalized response shape.
- local dev and intended production origin behavior are documented and tested.

---

# Phase 3 — MVP Frontend Parse Flow

## Objective

Build the first complete user-facing flow for QQ Music.

## Required work

- Create clean single-purpose landing interface.
- QQ Music public playlist URL input.
- client-side URL sanity validation.
- parse action.
- loading state.
- success state.
- user-readable error states.
- playlist summary.
- responsive track table.
- preserve original track order.
- handle long playlists without freezing the UI.

## UX principle

The primary path should remain:

> Paste → Parse → Export

Avoid dashboard-style complexity.

## Acceptance gate

A non-technical user can open the site, paste a valid QQ Music playlist URL, understand progress/errors, and see the complete parsed playlist without configuration.

---

# Phase 4 — Local Export & Clipboard

## Objective

Complete the core product promise: export parsed playlist data entirely in the browser.

## Required formats

- TXT
- CSV
- XLSX
- JSON

## Clipboard modes

- title only
- `title - artist`
- `title - artist - album`

## Rules

- exports are generated client-side
- no export file is uploaded to Worker/server storage
- Unicode must remain correct
- CSV must open cleanly in common spreadsheet software
- XLSX must contain a clear header row and ordered track rows
- JSON must use the normalized model or a clearly documented export representation
- filenames must be sanitized safely while preserving useful playlist names

## Acceptance gate

Exports from real QQ Music playlists preserve track count/order and expected title/artist/album values across all four formats.

---

# Phase 5 — Anonymous Product Statistics

## Objective

Add minimal aggregate product statistics without storing playlist contents.

## Infrastructure

- Cloudflare Web Analytics for site traffic
- Cloudflare D1 for aggregate parse counters

## Allowed D1 data

Examples:

- date
- platform
- successful parse count
- failed parse count

## Forbidden analytics data

Do not store:

- playlist URL
- playlist content
- song list
- track titles
- QQ number
- cookies
- user profile

## Acceptance gate

- successful parse count increments only after a validated successful parse
- failures can be counted separately without storing payload contents
- analytics failure never breaks core playlist parsing/export
- schema and privacy behavior are documented

---

# Phase 6 — Abuse Protection & Security Hardening

## Objective

Protect the free infrastructure and enforce constitution security boundaries.

## Required work

- rate limiting strategy appropriate for Cloudflare Workers
- strict supported-domain / provider behavior
- payload-size limits
- bounded pagination
- timeout handling
- no arbitrary upstream destination
- safe error responses
- no secret leakage
- dependency review
- security-focused tests for malformed inputs

## Acceptance gate

The Worker cannot trivially be abused as a generic network proxy, uncontrolled scraper, or unbounded resource consumer.

---

# Phase 7 — UI / Responsive Polish

## Objective

Make the MVP feel like a finished product without expanding product scope.

## Required work

- desktop/mobile layout polish
- accessible labels and keyboard behavior
- clear empty/loading/error/success states
- table usability for large playlists
- brand consistency for PlaylistOut
- clear privacy messaging
- clear supported-platform messaging: QQ Music only for MVP
- lightweight performance optimization

## Not allowed

Do not use this phase to add accounts, playback, migration, recommendations, or unrelated dashboard functionality.

## Acceptance gate

The application is clear and comfortable on common desktop and mobile screen sizes and remains fast for representative large playlists.

---

# Phase 8 — Production Deployment

## Objective

Deploy the complete MVP through the intended public infrastructure.

## Target production layout

- `playlistout.com` → frontend
- `www.playlistout.com` → canonical redirect if configured
- `api.playlistout.com` → Cloudflare Worker

## Required work

- GitHub Pages production deployment
- custom-domain verification
- Worker production deployment
- API domain routing
- production CORS verification
- HTTPS verification
- Cloudflare Web Analytics verification
- D1 binding verification
- CI/CD documentation
- production smoke test

## Acceptance gate

The production domain completes the real user flow end-to-end without local development dependencies.

---

# Phase 9 — QQ Music MVP Final Acceptance

## Objective

Independently validate the production system before calling v1.0 complete.

## Required real-world sample coverage

Use multiple public QQ Music playlists covering as many of the following as practical:

- small playlist
- medium playlist
- large / paginated playlist
- multi-artist tracks
- Chinese metadata
- English metadata
- Japanese/Korean or other Unicode metadata
- special punctuation/filename characters
- missing optional metadata

## Verify

- playlist name
- creator when available
- complete track count
- exact track order
- titles
- artist lists
- albums
- duration where exposed
- frontend rendering
- clipboard output
- TXT output
- CSV output
- XLSX output
- JSON output
- mobile layout
- expected error behavior
- analytics do not persist playlist contents

## MVP completion rule

PlaylistOut QQ Music MVP is complete only after P0–P9 acceptance gates are satisfied with evidence.

---

# Post-MVP Platform Expansion

Do not start this section until the QQ Music MVP is accepted.

Suggested provider order:

1. NetEase Cloud Music
2. Kugou Music
3. Kuwo Music
4. Migu Music
5. Qishui Music

Each new platform should be added as a provider behind the same normalized model and should pass the same style of real-source acceptance testing.

The frontend should require minimal or no redesign when adding a provider.

---

# Future Ideas — Not Commitments

Potential later features may include:

- additional export formats such as M3U/M3U8
- field-selection before export
- search/filter within parsed results
- batch public playlist parsing
- platform-to-platform migration
- optional richer public statistics

These are intentionally outside MVP scope and must not be implemented opportunistically during MVP phases.
