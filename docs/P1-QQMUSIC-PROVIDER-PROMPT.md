# PlaylistOut P1 — QQ Music Provider Core Implementation Prompt

> This document is the execution prompt for **Phase 1 — Shared Data Contract & QQ Provider Core**.
>
> Before modifying code, read and obey:
>
> 1. `docs/PROJECT-CONSTITUTION.md`
> 2. `docs/ROADMAP.md`
> 3. this document
>
> The constitution has higher priority than this prompt. If any implementation idea conflicts with the constitution, do not implement it.

---

# 1. Mission

Implement the first real production data path for PlaylistOut:

```text
public QQ Music playlist URL / playlist ID
        ↓
QQ Music provider inside Cloudflare Worker
        ↓
real QQ Music upstream request(s)
        ↓
validate + normalize source response
        ↓
PlaylistOut normalized Playlist JSON
```

P1 is **not** a frontend phase and **not** an export phase.

The goal of this phase is to prove that the Worker can reliably obtain a complete public QQ Music playlist and normalize it into PlaylistOut's platform-independent data contract.

The acceptance standard is real upstream behavior, not mocked success.

---

# 2. Current Repository Context

The repository is already bootstrapped as a monorepo:

```text
playlistout/
├── web/
├── worker/
├── cli/qqmusic/
├── docs/
├── .github/
├── package.json
└── README.md
```

The old QQ Music Python exporter has been preserved under:

```text
cli/qqmusic/qq_music_playlist_export.py
```

Treat that Python implementation as:

- an important behavioral reference
- evidence of previously working QQ endpoints and fallback ideas
- a source for field-name compatibility knowledge

Do **not** treat it as unquestionable truth.

Before selecting the Worker production request path, verify which QQ Music endpoint(s) still work against real public playlists today.

The legacy CLI currently contains multiple request paths, including concepts equivalent to:

- `c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg`
- `u.y.qq.com/cgi-bin/musicu.fcg` with `GetPlaylistDetail`
- an alternate `GetPlaylistSongs` style request

Do not blindly port all of them. Keep only fallback behavior that is still justified by real validation.

Do not modify or delete the legacy Python CLI unless a small test/documentation adjustment is strictly required by repository structure. P1 must not become a Python refactor.

---

# 3. Strict Scope

## P1 MUST implement

- QQ Music public playlist input recognition
- QQ Music playlist ID extraction
- strict input validation
- QQ Music provider module in Worker
- real upstream QQ Music request logic
- deliberate handling of required QQ headers/request formats
- response validation
- response normalization
- large-playlist retrieval / pagination if required by the selected upstream API
- explicit track order
- multiple artists
- album metadata
- playlist metadata
- optional reliable metadata such as duration, cover URL, track/source ID
- typed provider errors
- unit tests
- fixture-based normalization tests
- malformed-response tests
- pagination/completeness tests
- real public QQ Music playlist validation
- minimal integration into the existing Worker `/api/playlist` skeleton so the provider can be exercised end-to-end

## P1 MUST NOT implement

Do not implement any of the following in this phase:

- NetEase / Kugou / Kuwo / Migu / Qishui providers
- playlist migration to another platform
- QQ login
- QR login
- cookies supplied by users
- private playlists
- user account system
- database-backed playlist storage
- D1 statistics
- Cloudflare Web Analytics work
- rate limiting / abuse dashboards beyond what is absolutely required for correctness
- TXT export
- CSV export
- XLSX export
- JSON download UX
- clipboard features
- frontend results table
- frontend redesign
- loading UX
- production UI wiring
- admin dashboard
- generic proxy endpoints
- arbitrary URL fetching

Do not "helpfully" move Phase 2–5 work into P1.

---

# 4. Data Contract

The normalized model is already defined by the project constitution and Worker model.

Conceptually:

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

Required invariants:

1. `platform` for this provider must be a stable value such as `qqmusic`.
2. `id` must be the real QQ Music playlist ID as a string.
3. `name` must come from QQ Music source data; never guess it.
4. `trackCount` must describe the normalized playlist result consistently.
5. `tracks` must preserve source playlist order.
6. `Track.index` must make order explicit and must use one consistent convention across the project. Prefer 1-based user-facing order unless existing project code explicitly establishes another invariant.
7. multiple artists must remain an array; do not flatten them into one lossy string inside the normalized contract.
8. missing optional fields must remain missing/undefined rather than invented.
9. blank mandatory fields must not be silently accepted as a valid complete track.
10. platform-specific raw field names must not leak into frontend-facing types.

There are currently similar contract definitions in Worker and Web. P1 may align them if necessary, but do not introduce a third divergent contract or over-engineer a shared package unless it materially improves correctness without expanding scope.

---

# 5. Input Handling

Support public QQ Music playlist input at minimum in these forms:

```text
https://y.qq.com/n/ryqq/playlist/<playlistId>
```

and a direct numeric playlist ID where appropriate for internal/API testing.

Input parsing must not simply search for "some long number anywhere" and accept it as a playlist ID.

Implement deliberate validation rules.

Examples that must be handled safely:

- valid QQ playlist URL
- valid direct playlist ID
- whitespace around input
- URL with harmless query parameters
- malformed URL
- unsupported hostname
- non-numeric playlist identifier
- unrelated URL containing numbers
- empty input
- absurdly long input

Do not add QQ-number / user-profile batch export to the web MVP in this phase. That behavior belongs to the preserved CLI and is not part of the current web MVP contract.

---

# 6. QQ Music Upstream Strategy

Before coding the final provider path:

1. inspect the legacy Python implementation
2. inspect current QQ Music public playlist behavior
3. test candidate endpoint(s) against real public playlists
4. determine the smallest reliable production strategy
5. document why the selected primary/fallback path is used

Important rules:

- Prefer structured upstream JSON APIs over scraping rendered HTML.
- Do not implement browser automation.
- Do not add Puppeteer/Playwright to Worker.
- Do not rely on authenticated cookies for public playlists.
- Do not bypass access controls.
- Do not fetch arbitrary caller-controlled hosts.
- Upstream hostnames and paths must be coded/allowlisted by the provider.
- Required `Referer`, `User-Agent`, content type, or request body behavior may be implemented when needed for the public playlist endpoint.
- Do not copy obsolete magic values or request parameters unless real testing confirms they are still needed.

If more than one endpoint is retained as fallback, fallback behavior must be deterministic and testable.

A fallback may only be considered successful if its response passes the same completeness and normalization validation as the primary path.

---

# 7. Completeness and Fail-Closed Behavior

This is critical.

Do not return `success: true` merely because QQ Music returned HTTP 200.

The provider must distinguish at least:

- invalid user input
- unsupported QQ URL form
- playlist not found / unavailable
- upstream rejected request
- malformed upstream JSON
- structurally unexpected upstream response
- playlist metadata present but track list missing unexpectedly
- incomplete pagination
- timeout/network failure
- normalization failure

If QQ reports an expected total count and PlaylistOut retrieves fewer tracks without a justified source reason, do not silently present the result as complete.

When completeness cannot be trusted, fail clearly or explicitly represent the result as incomplete only if the constitution/contract is intentionally extended to support such a state. Do not invent an implicit partial-success state during P1.

Do not fabricate tracks, titles, albums, artists, counts, IDs, or creator information.

---

# 8. Large Playlists / Pagination

The legacy CLI contains request forms with limits such as 1000 tracks. Do not assume that one request is enough for every valid QQ playlist.

P1 must determine actual current upstream behavior.

If the selected endpoint paginates:

- implement bounded pagination
- preserve global order across pages
- avoid duplicate tracks introduced by page overlap
- detect a stalled/repeated page
- stop on a trustworthy completion condition
- verify final count where the source provides an expected count

If the selected endpoint reliably returns all tracks in one response, add evidence/tests demonstrating that behavior for large real playlists and keep code ready to reject obviously truncated responses.

Do not introduce an unbounded loop.

---

# 9. Normalization Rules

Normalize QQ data deliberately.

At minimum verify:

## Playlist

- ID
- name
- creator/display name when available
- cover URL when available
- expected/source track count when available

## Track

- explicit order/index
- QQ track ID or stable source ID when available
- title
- all artist names in source order
- album name when available
- duration converted to milliseconds when reliably available
- canonical/source URL only when it can be constructed reliably and truthfully

Special cases to test:

- multiple artists
- Chinese titles
- English titles
- Japanese/Korean/Unicode text
- punctuation and emoji
- missing album
- missing optional metadata
- duplicate song names that are actually different tracks
- same song appearing more than once in a playlist

Do not deduplicate legitimate repeated playlist entries unless QQ source semantics clearly indicate accidental API duplication.

---

# 10. Encoding

The old Python code contains compatibility handling for historical QQ encoding anomalies.

Do not automatically reproduce encoding repair logic everywhere.

Instead:

- test current real responses
- preserve valid UTF-8 unchanged
- only apply repair logic when there is a concrete, reproducible malformed encoding case
- keep any repair helper isolated and tested

Never run a destructive "fix encoding" transform over all strings without evidence that it is safe.

---

# 11. Worker Integration

The current P0 Worker exposes a skeleton route:

```text
GET /api/playlist?url=...
```

For P1, it is acceptable to wire the QQ provider into this existing route for end-to-end testing.

Do not redesign the public API architecture more than necessary; Phase 2 is responsible for final API contract hardening.

Expected behavior after P1:

### Valid QQ public playlist

```json
{
  "success": true,
  "data": {
    "platform": "qqmusic",
    "id": "...",
    "name": "...",
    "trackCount": 123,
    "tracks": []
  }
}
```

### Invalid/unavailable input

```json
{
  "success": false,
  "error": {
    "code": "SOME_STABLE_ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Do not return raw QQ payloads as the public response.

Do not expose internal exception stacks to clients.

Do not implement a generic `/proxy` escape hatch.

---

# 12. Provider Structure

Use a provider-oriented structure rather than putting all QQ logic in `worker/src/index.ts`.

A reasonable direction is conceptually:

```text
worker/src/
├── providers/
│   └── qqmusic/
│       ├── index.ts
│       ├── input.ts
│       ├── client.ts
│       ├── normalize.ts
│       └── ...
├── models/
│   └── playlist.ts
└── index.ts
```

Exact file count is not mandatory.

The important requirements are:

- routing is separate from QQ source parsing
- upstream request logic is isolated
- normalization is testable without live network access
- input parsing is testable independently
- future providers can be added without rewriting QQ-specific code or frontend code

Do not create abstraction layers with no current purpose. Keep it simple but structurally extensible.

---

# 13. Testing Requirements

P1 must include both deterministic tests and real-source validation.

## 13.1 Unit tests

At minimum:

- valid QQ playlist URL extraction
- direct playlist ID extraction
- query-string handling
- whitespace handling
- unsupported domain rejection
- unrelated numeric URL rejection
- malformed input rejection

## 13.2 Fixture-based normalization tests

Create representative sanitized QQ upstream response fixtures based on real observed shapes.

Test:

- playlist metadata mapping
- single artist
- multiple artists
- album mapping
- duration conversion
- source ID mapping
- order/index
- Unicode preservation
- missing optional fields

Fixtures must not contain secrets, cookies, tokens, private data, or unnecessary personal identifiers.

## 13.3 Malformed/adversarial upstream tests

At minimum:

- empty object
- missing expected data section
- non-array track collection
- track missing mandatory title
- malformed artist structures
- upstream non-zero error code
- unexpected content type / invalid JSON where practical at client boundary

## 13.4 Pagination/completeness tests

If pagination is used, test:

- multiple pages
- final page
- repeated/stalled page
- source count mismatch
- duplicate overlap handling if relevant
- maximum/bounded page behavior

## 13.5 Real public QQ Music validation — mandatory acceptance evidence

Mocks and fixtures are not enough.

Before declaring P1 complete, validate against **multiple real public QQ Music playlists**.

Use at least:

- one small playlist
- one medium playlist
- one large playlist if a large public playlist is available
- one playlist containing multiple-artist tracks
- Unicode/non-ASCII examples where available

For each real sample, record:

- playlist ID or public URL used for validation
- source-reported playlist name
- source-reported/expected track count when available
- PlaylistOut returned track count
- whether first several track titles/artists/albums match source
- whether final track/order is correct
- whether multi-artist representation is correct where applicable

Do not commit sensitive or private sample data.

A live validation script/test may be excluded from normal CI if upstream network flakiness would make CI unreliable, but the validation procedure must be reproducible and documented.

---

# 14. CI / Build Requirements

After implementation, run all relevant existing checks, not just Worker tests.

At minimum:

```text
Python CLI validation
Web typecheck/tests/build
Worker typecheck/tests/build dry-run
```

P1 must not break P0.

The existing Python CLI must remain intact and its tests must still pass.

Do not weaken tests or CI to obtain a green build.

Do not remove type checking.

Do not replace real assertions with trivial snapshots or `expect(true).toBe(true)` style placeholders.

---

# 15. Documentation Requirements

Update documentation only where the implementation changes reality.

Document:

- QQ provider is now implemented
- accepted QQ input forms
- provider limitations discovered during real validation
- selected upstream strategy at a high level
- how to run deterministic tests
- how to perform optional real-source validation

Do not claim the frontend product is complete.

Do not claim TXT/CSV/XLSX/JSON web export is complete in P1.

Do not mark later roadmap phases complete.

Do not claim production Worker deployment if it was not actually deployed and verified.

---

# 16. Forbidden Shortcuts

The following are automatic P1 rejection conditions:

1. Provider returns hard-coded/demo playlist data.
2. Tests only mock the provider and no real QQ playlist is validated.
3. Raw QQ response is passed through as PlaylistOut API output.
4. Track order is lost.
5. Multiple artists are flattened incorrectly or silently dropped.
6. Source count mismatch is ignored.
7. One request is assumed to be complete without validating large-playlist behavior.
8. QQ upstream hostname comes directly from a user-controlled URL.
9. Generic arbitrary proxying is introduced.
10. Login/cookies/private playlist support is added.
11. Frontend/export/statistics work expands the phase unnecessarily.
12. Old Python CLI is deleted or functionally rewritten without justification.
13. Errors are swallowed and converted to fake empty-success responses.
14. Optional metadata is fabricated.
15. CI/tests are weakened to pass.
16. README/docs claim features that do not actually work.

---

# 17. Required Execution Procedure

Follow this order:

### Step 1 — Inspect

Read:

- constitution
- roadmap P1
- current Worker skeleton
- normalized model
- current tests
- legacy Python QQ implementation

Do not start by rewriting files blindly.

### Step 2 — Verify QQ upstream

Test current candidate public QQ playlist endpoint behavior using real public playlists.

Decide and document:

- primary endpoint/request form
- required headers
- response shape
- count/pagination behavior
- justified fallback, if any

### Step 3 — Implement provider

Build QQ-specific input parsing, client/request, normalization, and typed failure handling.

### Step 4 — Connect minimal Worker route

Wire the provider into the existing P0 `/api/playlist` route only as much as needed for P1 end-to-end validation.

### Step 5 — Add deterministic tests

Input, normalization, malformed response, completeness/pagination.

### Step 6 — Run real validation

Exercise multiple real public QQ Music playlists and compare results against the source.

### Step 7 — Full repository validation

Run all CLI/Web/Worker checks.

### Step 8 — Review diff

Confirm the change stayed inside P1 scope.

### Step 9 — Commit / push

Only after all required validation passes.

Do not force-push or rewrite repository history.

---

# 18. P1 Acceptance Gate

Declare **PASS** only when all of the following are true:

- valid public QQ Music playlist URL is recognized correctly
- playlist ID extraction is strict and tested
- Worker performs real QQ public playlist request(s)
- normalized PlaylistOut model is returned
- playlist name is correct
- creator is correct when available
- source/returned track count behavior is understood and verified
- all expected tracks are returned for tested playlists
- original order is preserved
- track titles are correct
- artist arrays are correct
- album values are correct where source provides them
- Unicode is preserved
- large-playlist behavior is validated
- malformed/unavailable upstream data fails explicitly
- generic proxying is impossible through this implementation
- deterministic tests pass
- real public playlist validation passes
- Python CLI remains valid
- Web still builds/tests
- Worker typecheck/tests/build pass
- documentation does not overclaim

If any material item above cannot be verified, final status must be **BLOCKED**, not PASS.

---

# 19. Required Final Report

At completion, output a concise but evidence-based report with exactly these sections:

## Status

`PASS` or `BLOCKED`

## Commit

- final commit SHA
- whether pushed to `main`

## Files Changed

List the important changed/added files and why.

## QQ Upstream Strategy

State:

- primary upstream endpoint/request approach
- fallback(s), if any
- why they were selected
- observed pagination/count behavior

Do not expose secrets or cookies.

## Data Contract

State which Playlist/Track fields are actually populated and which remain optional.

## Automated Validation

Report actual commands/results for:

- Worker tests
- Worker typecheck/build
- Web tests/typecheck/build
- Python CLI tests

## Real QQ Music Validation

For each real public playlist tested, report:

- public playlist ID/URL
- expected/source count when available
- returned count
- order verification
- title/artist/album spot checks
- multi-artist check where applicable
- result

## Known Limitations

Only real remaining limitations, not generic boilerplate.

## Out-of-Scope Confirmation

Explicitly confirm that P1 did **not** add:

- other music providers
- login/private-playlist support
- generic proxying
- frontend export/UI implementation
- D1 statistics

---

# Final Principle

P1 is complete only when PlaylistOut can truthfully say:

> Given a real public QQ Music playlist, the Worker can retrieve the complete playlist and return a trustworthy, normalized PlaylistOut data model.

Anything less is not P1 completion.
