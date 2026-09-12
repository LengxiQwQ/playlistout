# PlaylistOut Roadmap

> Read together with `PROJECT-CONSTITUTION.md`. The constitution defines the non-negotiable product, architecture, privacy, and security boundaries. This roadmap defines the complete delivery order from repository bootstrap to a production-ready QQ Music MVP and v1.0 release.

# 0. MVP Definition

PlaylistOut MVP supports **public QQ Music playlists only**.

The complete user journey is:

1. Open `https://playlistout.com`.
2. Paste a public QQ Music playlist URL.
3. PlaylistOut validates the input and parses the playlist through `api.playlistout.com`.
4. The user sees normalized playlist metadata and tracks in the original source order.
5. The user exports locally as TXT / CSV / XLSX / JSON or copies formatted text.
6. PlaylistOut records only anonymous aggregate usage statistics; playlist contents are never persisted.

The product principle remains:

> **Paste. Parse. Export.**

The QQ Music MVP is complete only when P0–P9 acceptance gates are satisfied with real evidence and the production website works end-to-end without local-development dependencies.

## Global delivery rules

These rules apply to every phase:

- Follow `PROJECT-CONSTITUTION.md` first.
- Do not expand MVP scope opportunistically.
- Do not add NetEase, Kugou, Kuwo, Migu, Qishui, Spotify, Apple Music, login, private playlists, playback, downloading, migration, payments, ads, AI features, accounts, or cloud playlist history during P0–P9.
- Never persist playlist URLs, playlist IDs as user history, song lists, song titles, artists, albums, exported files, QQ numbers, authentication cookies, or user identity.
- Never implement a generic arbitrary HTTP proxy.
- Never fabricate missing source metadata.
- Preserve legitimate repeated playlist entries. The same track may intentionally appear more than once and must remain more than once.
- Tests must not be weakened merely to obtain green CI.
- Existing Python CLI behavior must remain intact unless an explicitly scoped maintenance fix is required.
- Every phase must have real validation appropriate to its scope; mocks alone are not sufficient when the phase claims real-source or production behavior.

---

# Phase 0 — Repository & Infrastructure Foundation

## Objective

Transform the original QQ Music Python repository into the PlaylistOut monorepo without deleting the existing CLI implementation.

## Required work

- Move the existing Python QQ Music exporter into `cli/qqmusic/`.
- Move its Python dependencies, tests, and legacy documentation with it.
- Preserve CLI behavior.
- Replace the root README with a PlaylistOut project-level README.
- Initialize `web/` as React + TypeScript + Vite.
- Initialize `worker/` as a Cloudflare Worker TypeScript project.
- Create clean repository conventions and `.gitignore` rules.
- Rework CI so the repository validates:
  - Python CLI
  - web TypeScript/tests/build
  - Worker TypeScript/tests/build
- Prepare GitHub Pages deployment for the `web` build.
- Prepare Worker configuration for Cloudflare deployment without inventing secrets.
- Document external/manual setup requirements.
- Keep P0 limited to infrastructure and a minimal API/health skeleton.

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
- no unnecessary traditional backend/server/database framework was introduced
- documentation accurately describes any remaining manual Cloudflare/GitHub configuration

---

# Phase 1 — Shared Data Contract & QQ Music Provider Core

## Objective

Implement a real QQ Music provider in the Worker and return PlaylistOut's normalized playlist model with strict completeness guarantees.

## Required work

- Define normalized `Playlist` / `Track` TypeScript contracts.
- Implement QQ playlist ID extraction and strict input validation.
- Reuse the proven concepts from the preserved Python CLI only after validating current QQ behavior.
- Select a current real public QQ Music structured upstream strategy.
- Preserve useful fallback behavior only when it is still valid.
- Handle current QQ response field/encoding behavior deliberately.
- Implement bounded pagination for playlists larger than a single upstream page.
- Normalize:
  - playlist ID
  - playlist name
  - creator when available
  - cover when available
  - expected/source track count when available
  - explicit track order
  - title
  - all artists in source order
  - album when available
  - duration when available
  - stable track/source IDs when available
- Return explicit typed errors for invalid, unsupported, unavailable, malformed, upstream-failed, or incomplete playlists.

## Pagination and repeated-entry rules

This phase must not silently alter playlist semantics.

- Preserve the exact playlist sequence returned by a trustworthy source.
- A track appearing twice is not automatically an API duplicate; legitimate repeated playlist entries must remain duplicated.
- Do **not** deduplicate tracks merely because `songmid`, numeric ID, title, artist, or album matches an earlier entry.
- If an upstream offset appears stalled, detect the stalled/repeated **page** using sufficiently strong page-level evidence rather than deleting matching songs one by one.
- If the upstream returns an ambiguous overlapping page and PlaylistOut cannot distinguish transport overlap from legitimate repeated entries with confidence, fail closed with `INCOMPLETE_PLAYLIST` instead of guessing and mutating the sequence.
- If QQ reports an expected total, successful normalization must exactly match that total.
- Pagination loops must be bounded and must fail closed when no trustworthy progress is possible.

## Required deterministic tests

At minimum:

- URL / playlist-ID parsing
- representative response normalization fixtures
- malformed upstream responses
- primary pagination across multiple pages
- fallback pagination across multiple pages
- source-count mismatch
- empty promised page
- stalled/repeated page
- bounded pagination
- same track legitimately appearing more than once
- same track appearing at a page boundary (for example positions 1000 and 1001) and both copies surviving
- Unicode / multiple artists / missing optional metadata

## Required real-source validation

Use multiple real public QQ Music playlists including:

- small playlist
- medium playlist
- large playlist
- at least one real playlist exceeding one upstream page (>1000 tracks when available)
- multiple artists
- Chinese and non-ASCII/Unicode metadata

For the >1000 sample, verify both sides of the page boundary, complete count, first/last entries, and continuous explicit indices.

## Acceptance gate

P1 is accepted only if:

- production provider code—not test/demo data—performs real QQ requests
- real public QQ playlists produce complete normalized results
- expected count and returned count agree where QQ exposes a source total
- exact order is preserved
- legitimate repeated entries are preserved
- no partial/truncated result is represented as success
- no metadata is fabricated
- both primary and fallback paths obey the same fail-closed completeness rules
- mocks are supplementary evidence, not the sole acceptance evidence

---

# Phase 2 — Public API Contract & Reliability

## Objective

Turn the P1 provider into a stable, bounded, frontend-ready public API.

## Required work

- Establish one clearly documented stable parse endpoint for MVP. Avoid unnecessary API proliferation.
- Define the exact success/error JSON response contract.
- Define stable error codes and HTTP status mapping for frontend UX.
- Keep Web and Worker contracts synchronized; do not allow divergent `Playlist` / `Track` definitions.
- Reject arbitrary proxy URLs and arbitrary caller-controlled upstream destinations.
- Restrict outbound QQ requests to hardcoded/allowlisted QQ Music hosts and paths.
- Validate query/request shape, input size, and identifier constraints.
- Keep request timeouts bounded.
- Keep pagination/track-count work bounded.
- Define a defensible maximum response/work size and fail clearly when exceeded.
- Ensure unexpected upstream JSON/HTML/error bodies cannot become fake success responses.
- Keep CORS restricted to approved PlaylistOut production origins plus explicit local-development origins.
- Return safe client-facing errors without stack traces, internal secrets, or unnecessary raw upstream payloads.
- Keep health endpoint minimal if retained.
- Document API examples for valid request, success, invalid input, unsupported input, unavailable playlist, incomplete playlist, timeout, and upstream failure.

## Required tests

- Worker route integration tests
- response-schema/error-code tests
- method/query validation
- CORS allowed/disallowed origin behavior
- timeout and malformed upstream behavior
- generic proxy attempts
- oversized/absurd input
- provider error → HTTP/API mapping
- normalized response contract consumed by Web without platform-specific raw fields

## Acceptance gate

P2 is accepted only if:

- frontend can consume one stable normalized response shape
- API cannot be used as a generic proxy
- invalid inputs fail deterministically
- upstream failures remain failures
- timeout/resource limits are bounded
- production and local-development CORS behavior are documented and tested
- no P2 change breaks P1 real-source validation

---

# Phase 3 — Complete MVP Frontend Parse Flow

## Objective

Build the first complete user-facing flow for QQ Music: paste → parse → preview.

## Required work

- Replace the P0 skeleton with a clean single-purpose PlaylistOut interface.
- Keep the product focused on one main input and one primary action.
- Accept public QQ Music playlist URLs.
- Perform lightweight client-side sanity validation before requesting the API.
- Call only the PlaylistOut normalized API, never QQ raw endpoints directly from UI components.
- Implement:
  - initial/empty state
  - input state
  - loading state
  - success state
  - invalid-input state
  - unsupported-link state
  - playlist unavailable/private state
  - upstream/network failure state
  - incomplete-playlist state
- Prevent stale responses from overwriting newer user requests when the user submits again quickly.
- Present playlist summary information such as name, creator, cover, track count, and source platform when available.
- Render a readable track table/list with:
  - original index
  - title
  - artists
  - album
  - duration when useful
- Preserve exact normalized order and repeated entries.
- Handle missing artists/albums honestly in UI presentation without mutating the normalized data.
- Keep large playlists responsive; use simple rendering optimizations or virtualization only if real profiling shows it is needed.
- Support retry/reset behavior without a page reload.

## UX principle

The primary path remains:

> **Paste → Parse → Export**

Avoid dashboard-style complexity, onboarding flows, account prompts, or settings pages that are not required for MVP.

## Required tests

- input validation UX
- success rendering using normalized fixtures
- error-code → user-message mapping
- loading and retry states
- stale-request behavior
- repeated-track rendering
- large-list representative rendering

## Acceptance gate

A non-technical user can open the site, paste a valid public QQ Music playlist URL, understand progress and errors, and see the complete parsed playlist without configuration or login.

---

# Phase 4 — Browser-Local Export & Clipboard

## Objective

Complete the core product promise: export parsed playlist data entirely in the browser.

## Required export formats

- TXT
- CSV
- XLSX
- JSON

## Required clipboard modes

- title only
- `title - artist`
- `title - artist - album`

## Export rules

- Generate all files client-side.
- Do not upload generated files or playlist contents to Worker/D1/storage.
- Preserve normalized track order and legitimate repeated entries.
- Preserve Unicode correctly.
- Use safe and predictable line endings/encoding.
- CSV must be RFC-style escaped correctly and open cleanly in common spreadsheet software.
- Protect spreadsheet-oriented exports from formula execution/injection while keeping JSON/TXT source text faithful.
- XLSX cells must be explicit data values, include a clear header row, and retain track order.
- JSON must use the documented normalized model or a clearly documented export representation.
- Sanitize filenames for common Windows/macOS/browser constraints while preserving useful playlist names.
- Handle reserved/empty/very long filenames safely.
- Clipboard operations must provide visible success/failure feedback.
- Export buttons must be disabled or unavailable until a valid parsed playlist exists.

## Required tests

Use deterministic fixtures and real parsed playlists to verify:

- exact row/track count
- exact ordering
- repeated entries survive
- multi-artist formatting
- missing optional metadata
- commas/quotes/newlines in CSV fields
- Chinese/English/Japanese/Korean/emoji
- formula-like spreadsheet values such as `=`, `+`, `-`, and `@`
- filename sanitization
- all clipboard modes

## Acceptance gate

P4 is accepted only if all four export formats and all clipboard modes preserve the intended data semantics from real QQ playlists and no server-side file storage exists.

---

# Phase 5 — Anonymous Aggregate Statistics & Traffic Visibility

## Objective

Add useful product/traffic statistics without collecting playlist contents or user identity.

## Infrastructure

- Cloudflare Web Analytics for private owner-facing traffic analytics.
- Cloudflare D1 for minimal aggregate PlaylistOut counters.

## Required product metrics

At minimum support aggregate counters needed by PlaylistOut, such as:

- total successful parses
- today's successful parses
- total failed parses when useful
- successful parses by platform (`qqmusic` for MVP; schema must allow future providers)
- optional aggregate page-view counter if a public page-view total is desired

Cloudflare Web Analytics may remain the authoritative owner-facing source for richer visitor/page-view information. Do not copy unnecessary visitor/device/location details into D1.

## D1 design rules

- Use migrations/schema files committed to the repository.
- Store aggregate counters only.
- A suitable design may aggregate by date + metric + platform.
- Use atomic/upsert-style increments suitable for concurrent Worker requests.
- Successful parse counters increment only after a fully validated successful parse.
- Failed parse counters must not include the submitted URL/ID or raw error payload.
- Analytics writes must be best-effort and must never break parsing/export when analytics is unavailable.

## Forbidden analytics data

Do not store:

- playlist URL
- playlist ID as user history
- playlist content
- song list
- track titles
- artists
- albums
- QQ number
- cookies/authentication data
- raw IP addresses
- user identifiers/accounts
- exported files

## Public statistics UX

If statistics are shown publicly, keep them aggregate and simple, for example:

- total playlists parsed
- playlists parsed today
- per-platform totals

Do not build an admin dashboard in MVP.

## Required tests

- success increments exactly once per successful parse
- failures are counted separately if enabled
- analytics failures do not change API success/failure semantics
- counters contain no playlist payload data
- stats read endpoint, if public, exposes only aggregate values
- concurrency-safe update behavior where practical

## Acceptance gate

P5 is accepted only if aggregate statistics work in production, privacy boundaries are documented, and a D1 failure cannot break the core product.

---

# Phase 6 — Abuse Protection & Security Hardening

## Objective

Protect the free public infrastructure and enforce the constitution's security/privacy boundaries before broad release.

## Required work

- Implement a practical Cloudflare-compatible rate-limiting strategy or equivalent bounded abuse control.
- Keep limits generous enough for normal playlist parsing and deterministic enough for UX.
- Keep supported provider/upstream host behavior hardcoded/allowlisted.
- Enforce input length and request method constraints.
- Enforce bounded pagination/work limits.
- Keep upstream timeouts bounded.
- Prevent arbitrary redirects from becoming arbitrary upstream fetches.
- Add appropriate safe response/security headers for Worker/frontend where relevant.
- Keep CORS origin behavior strict.
- Ensure errors do not leak stack traces, secrets, environment variables, tokens, or raw internal objects.
- Review dependencies and lockfiles for unnecessary/heavy/vulnerable packages.
- Ensure no analytics path stores prohibited data.
- Do not persist playlist responses in D1/KV/R2 merely as a caching shortcut.
- Add security-focused malformed/adversarial request tests.

## Optional escalation only when justified

Do not add CAPTCHA/Turnstile or complex bot systems by default. Add them only if simple rate limiting proves insufficient and the added friction is justified.

## Acceptance gate

The Worker cannot trivially be abused as:

- a generic network proxy
- an uncontrolled scraper
- an unbounded pagination/CPU consumer
- a secret/error oracle

Normal users must still be able to parse representative large public playlists successfully.

---

# Phase 7 — Product UI, Responsive, Accessibility, SEO & Privacy Polish

## Objective

Make PlaylistOut look and behave like a finished public product without expanding core scope.

## Required UI/UX work

- Polish desktop and mobile layouts.
- Keep visual hierarchy centered on paste → parse → export.
- Provide clear empty/loading/error/success states.
- Make the large-playlist table/list usable on narrow screens.
- Ensure keyboard navigation and visible focus behavior.
- Add accessible labels, sensible semantics, and adequate contrast.
- Add concise privacy messaging and QQ-Music-only MVP messaging.
- Keep UI fast for representative 1000+ track results.
- Avoid introducing a heavy component framework unless there is a demonstrated benefit.

## Brand and website metadata

- Finalize page title and meta description.
- Add canonical URL for `https://playlistout.com/`.
- Add Open Graph/social sharing metadata.
- Provide favicon/app icons appropriate for the website.
- Set language/viewport metadata correctly.
- Provide `robots.txt` and a minimal `sitemap.xml` when appropriate.
- Ensure internal/public links point to current `playlistout` repository/domain names.

## Privacy/public information

Provide a stable public privacy notice/page that clearly states, in plain language:

- public playlists only
- playlist contents and URLs are not persisted
- exports are generated locally in the browser
- only aggregate anonymous usage statistics are collected
- Cloudflare/GitHub infrastructure may process normal web requests under their own platform policies

Implementation may use a static page or Pages-compatible route, but it must not introduce fragile routing that breaks on refresh.

## Browser compatibility

Perform basic validation on current versions of at least:

- Chrome
- Edge
- Firefox
- Safari/WebKit where practically testable

Do not claim a browser is tested if it was not actually exercised.

## Acceptance gate

P7 is accepted only if the application is clear and comfortable on common desktop/mobile sizes, has a coherent public identity, exposes accurate privacy information, has sensible SEO/share metadata, and remains responsive with representative large playlists.

---

# Phase 8 — Production Deployment & Continuous Delivery

## Objective

Deploy the complete MVP through the intended public infrastructure and make future production updates repeatable.

## Target production layout

- `https://playlistout.com` → canonical frontend
- `https://www.playlistout.com` → redirect/canonicalize to the root domain when configured
- `https://api.playlistout.com` → Cloudflare Worker

## Required deployment work

- GitHub Pages production deployment from the intended Web build.
- Preserve custom-domain CNAME behavior in built artifacts.
- Verify DNS and HTTPS.
- Verify canonical root-domain behavior and `www` behavior.
- Deploy Worker production build.
- Verify API custom-domain routing.
- Verify production CORS from the real frontend origin.
- Provision/bind D1 production database and apply committed migrations.
- Verify Cloudflare Web Analytics on the real site.
- Configure Worker deployment automation through GitHub Actions when suitable credentials/secrets are available.
- Ensure deploy workflow does not expose Cloudflare credentials in logs.
- Require CI/build success before automated production deployment where practical.
- Document required GitHub Secrets/Cloudflare bindings and recovery steps.
- Keep local development configuration separate from production secrets.

## Production smoke test

After production deployment, test from public URLs:

1. open `playlistout.com`
2. parse a real public QQ playlist
3. verify summary and track rendering
4. verify an export download
5. verify clipboard behavior
6. verify stats path without exposing playlist data
7. verify expected invalid-input error
8. verify HTTPS/CORS

## Deployment failure rule

Never claim production deployment succeeded based only on a local build. Record the actual deployment/run evidence. If external credentials or console-only configuration are unavailable, mark that specific substep as externally blocked rather than inventing success.

## Acceptance gate

P8 is accepted only if the real production domain completes the core user flow end-to-end without local dependencies and the deployment procedure is repeatable/documented.

---

# Phase 9 — Final Independent Acceptance & v1.0 Release

## Objective

Perform a final whole-product audit of the production system, close release-blocking defects, and publish the QQ Music MVP as `v1.0.0`.

## 9.1 Real-world playlist matrix

Use multiple public QQ Music playlists covering as many of the following as practical:

- small playlist
- medium playlist
- large playlist
- >1000/paginated playlist
- legitimate repeated tracks
- multiple artists
- Chinese metadata
- English metadata
- Japanese/Korean/other Unicode metadata
- emoji/punctuation
- special filename characters
- missing optional metadata

## 9.2 End-to-end browser validation

At least one real browser-based E2E path must exercise the actual product rather than testing pieces independently:

```text
playlistout.com
→ paste real QQ playlist URL
→ parse through api.playlistout.com
→ render complete tracks
→ copy formatted text
→ download TXT
→ download CSV
→ download XLSX
→ download JSON
```

Verify downloaded file contents, not merely that a download event occurred.

## 9.3 Data correctness verification

Verify against source/known truth where practical:

- playlist ID/name
- creator when available
- complete track count
- exact order
- legitimate repeated entries
- titles
- full artist arrays
- albums
- durations when exposed
- first/page-boundary/last tracks for paginated samples

No partial success is allowed.

## 9.4 Export verification

For every required export format verify:

- exact number of tracks/rows
- exact ordering
- repeated entries preserved
- Unicode preserved
- special CSV characters handled
- spreadsheet formula injection mitigated
- filenames safe and useful
- output opens in representative target software where practical

## 9.5 UI/browser/mobile verification

Verify:

- desktop layout
- narrow/mobile layout
- keyboard interaction
- loading/error/retry flow
- large-playlist performance
- Chrome
- Edge
- Firefox
- Safari/WebKit where practically testable

## 9.6 Privacy/security/statistics verification

Verify:

- no playlist content persisted in D1 or other storage
- stats rows contain aggregate data only
- successful parse counters update at the correct time
- analytics failures do not break parsing
- generic proxy attempts fail
- CORS is production-appropriate
- rate limits/bounds do not break normal use
- no secret appears in repository, build output, API response, or logs

## 9.7 SEO/public-site verification

Verify:

- title/description
- canonical URL
- Open Graph metadata
- favicon
- robots/sitemap when implemented
- privacy notice
- GitHub/project links
- no stale QQ-only Python-project description remains in user-facing project metadata/docs where it should now describe PlaylistOut

## 9.8 Release preparation

Before release:

- update README to represent the real shipped product
- document local development and deployment commands
- document supported QQ input forms and limitations
- document privacy/statistics behavior
- make versioning consistently represent the v1.0 release where applicable
- add concise release notes / changelog entry
- ensure all normal CI jobs pass on the release commit
- record the production Worker version/deployment evidence and Pages deployment evidence

## 9.9 Release publication

After all release blockers are closed:

- create Git tag `v1.0.0`
- create GitHub Release `v1.0.0`
- release notes should summarize actual shipped functionality and known limitations
- do not claim unsupported platforms/features

If tooling cannot create the tag/release because of permissions, prepare the exact release notes and commands/checklist and report the external block. Do not fabricate a published release.

## Final acceptance report

Produce a final report containing:

- overall `PASS` or `BLOCKED`
- final commit SHA
- CI evidence
- Pages production deployment evidence
- Worker production deployment/version evidence
- D1/Web Analytics verification status
- real playlist test matrix
- browser/E2E verification matrix
- export verification matrix
- privacy/security checks
- known non-blocking limitations
- exact external/manual steps still required, if any

## MVP completion rule

PlaylistOut QQ Music MVP is complete only when:

- P0–P9 required work is implemented
- release-blocking defects discovered during P9 are fixed and re-tested
- production end-to-end flow passes
- required privacy/security boundaries hold
- release commit passes CI
- production deployment is verified
- `v1.0.0` is published or the only remaining block is an explicitly documented external permission/manual action

---

# Post-MVP Platform Expansion

Do not start this section until the QQ Music MVP is accepted.

Suggested provider order:

1. NetEase Cloud Music
2. Kugou Music
3. Kuwo Music
4. Migu Music
5. Qishui Music

Each new platform must be implemented as a provider behind the same normalized contract and must pass equivalent real-source completeness testing.

Adding a provider must not require redesigning the generic frontend/export layers.

Statistics schema should already support per-platform counters without redesign.

---

# Future Ideas — Not MVP Commitments

Potential later features may include:

- M3U/M3U8 export
- export field selection
- search/filter within parsed results
- batch public playlist parsing
- direct platform-to-platform migration
- richer public statistics
- optional API documentation for third-party consumers

These are intentionally outside QQ Music MVP scope and must not be implemented opportunistically during P0–P9.