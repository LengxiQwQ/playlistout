# PlaylistOut MVP Autopilot Execution Prompt

> This is the execution prompt for completing the QQ Music MVP from the current repository state through P9 and v1.0 release preparation/publication.
>
> This prompt does **not** replace the project constitution or roadmap.

# 1. Authority and required reading

Before changing any code, read the current latest `main` and fully read:

1. `docs/PROJECT-CONSTITUTION.md`
2. `docs/ROADMAP.md`
3. `docs/P1-QQMUSIC-PROVIDER-PROMPT.md`
4. this document

Priority order:

```text
PROJECT-CONSTITUTION.md
        ↓
ROADMAP.md
        ↓
phase-specific requirements / this autopilot prompt
```

If a proposed implementation conflicts with the constitution, do not implement it.

# 2. Mission

Complete PlaylistOut's **public QQ Music MVP** from the current state all the way through the final P9 acceptance/release flow.

Work continuously through the remaining phases without waiting for manual approval after every phase:

```text
P1 closure
→ P2 Public API Contract & Reliability
→ P3 Complete MVP Frontend Parse Flow
→ P4 Browser-Local Export & Clipboard
→ P5 Anonymous Aggregate Statistics & Traffic Visibility
→ P6 Abuse Protection & Security Hardening
→ P7 Product UI / Responsive / Accessibility / SEO / Privacy Polish
→ P8 Production Deployment & Continuous Delivery
→ P9 Final Independent Acceptance & v1.0 Release
```

Do **not** start Post-MVP platform expansion.

# 3. Current-state rule: inspect, do not trust reports

Do not assume previous completion reports are correct.

Start by inspecting the latest `main`, current source, tests, workflows, deployed configuration, and documentation.

P0 infrastructure is already established, but verify that your work does not regress it.

P1 is substantially implemented, but the current branch must be treated as requiring a final correctness closure before moving to P2.

# 4. Mandatory P1 closure before P2

The previously identified remaining P1 correctness issue concerns legitimate repeated playlist entries across pagination boundaries.

Current/previous overlap logic must not silently delete a legitimate duplicate track merely because the same `songmid`, track ID, title, artist, or album occurs at the end of one page and the beginning of the next.

Required behavior:

```text
page 1 ends with position #1000 = Track A
page 2 begins with position #1001 = Track A
```

If these are two real playlist entries, the final normalized playlist must retain **both** entries.

Rules:

- Do not content-deduplicate playlist entries.
- Do not automatically trim page-boundary matches merely because track IDs/metadata match.
- Detect a truly stalled/repeated **page** using strong page-level evidence rather than deleting matching individual tracks.
- If transport overlap is genuinely observed but cannot be distinguished from legitimate repeated playlist entries with confidence, fail closed with `INCOMPLETE_PLAYLIST` instead of guessing.
- Preserve exact source order.
- Preserve legitimate repeated entries anywhere in the playlist.
- Exact source total must still be enforced when available.

Add deterministic tests including at minimum:

```text
total = 1002
page 1: positions 1..1000, position 1000 = Track A
page 2: position 1001 = Track A, position 1002 = Track B
```

Expected:

- `tracks.length === 1002`
- both Track A entries survive at indices 1000 and 1001
- no false `INCOMPLETE_PLAYLIST`

Keep the existing stalled-page, incomplete-page, primary-pagination, fallback-pagination, >1000 real-source, Unicode, multiple-artist, and fail-closed coverage.

When P1 closure passes, run the full repository checks, commit it as a P1 closure commit, and push before beginning P2.

# 5. Phase execution protocol — mandatory

Execute phases sequentially. Do not jump ahead.

For **every phase**:

1. Read that phase's complete `ROADMAP.md` objective, required work, tests, and acceptance gate.
2. Inspect existing implementation before editing.
3. Implement only what is necessary to satisfy that phase and preserve the architecture.
4. Add/adjust meaningful tests.
5. Run the relevant phase tests.
6. Run regression checks for Worker, Web, and Python CLI as applicable.
7. Fix failures before claiming the phase complete.
8. Update documentation only to reflect reality.
9. Commit the completed phase separately.
10. Push the commit to `origin/main`.
11. Verify GitHub CI / deployment status when accessible.
12. If the push reveals a real CI/deployment regression, fix it before proceeding to the next phase.

Do not create one giant P2–P9 commit.

Suggested commit style:

```text
fix(worker): close P1 repeated-entry pagination correctness
feat(api): complete P2 public API contract and reliability
feat(web): complete P3 playlist parse and preview flow
feat(export): complete P4 browser-local exports and clipboard
feat(stats): complete P5 anonymous aggregate statistics
feat(security): complete P6 abuse protection and hardening
feat(web): complete P7 product polish, SEO and privacy
ci(deploy): complete P8 production delivery pipeline
release: complete P9 PlaylistOut v1.0.0 acceptance
```

Exact wording may vary, but each phase must remain independently identifiable in Git history.

# 6. Git safety

- Work on the current repository and current intended `main` history.
- Do not force push.
- Do not rewrite existing history.
- Do not delete tags/releases/history to simplify the task.
- Do not silently discard user changes.
- Do not make destructive repository operations without necessity.
- Preserve the legacy Python CLI under `cli/qqmusic/`.

# 7. Scope boundaries — absolute

The QQ Music MVP must remain small and focused.

Do not add during this run:

- NetEase provider
- Kugou provider
- Kuwo provider
- Migu provider
- Qishui provider
- Spotify / Apple Music integration
- QQ login
- QR-code login
- user-provided cookies
- private playlist access
- account/registration system
- cloud playlist history
- playback
- music/audio downloading
- lyric downloading
- recommendation/AI features
- platform-to-platform migration
- paid plans/subscriptions
- advertisements
- admin dashboard
- generic proxy
- arbitrary URL fetch endpoint
- unrelated framework migrations

Do not replace React + TypeScript + Vite + GitHub Pages + Cloudflare Worker because another stack is personally preferred.

# 8. Architecture rules

Preserve the intended data path:

```text
playlistout.com
   ↓
React / TypeScript / Vite
   ↓
api.playlistout.com
   ↓
Cloudflare Worker
   ↓
QQ Music Provider
   ↓
normalized Playlist / Track contract
   ↓
frontend preview + local export
```

Rules:

- Frontend consumes PlaylistOut normalized data only.
- QQ raw response shapes stay inside the QQ provider.
- Worker does not generate TXT/CSV/XLSX export files.
- Browser does not call unstable QQ upstream APIs directly.
- User cannot choose arbitrary Worker outbound hosts.
- D1 is not playlist storage.
- Do not store playlist responses in D1/KV/R2 as a shortcut.
- Avoid unnecessary abstractions and enterprise patterns.

# 9. P2 guidance — API Contract & Reliability

Follow `ROADMAP.md` completely.

Important outcomes:

- one stable MVP playlist parse endpoint
- stable typed success/error response
- documented status/error mapping
- synchronized Web/Worker normalized contract
- strict allowed upstream behavior
- no proxy escape hatch
- bounded timeout/input/pagination/work
- safe CORS
- safe errors
- route/integration/security tests

Do not redesign the entire API merely for architectural elegance. Stabilize what the product actually needs.

Commit + push P2 before P3.

# 10. P3 guidance — Frontend Parse & Preview

Replace the P0 placeholder experience with a usable product flow.

Required user flow:

```text
open site
→ paste QQ public playlist URL
→ parse
→ loading
→ success/error
→ playlist summary
→ complete track list/table
```

Keep the UX simple.

Important:

- support retry/reset
- prevent stale response races
- preserve order and repeated entries
- display missing optional values honestly
- make 1000+ tracks usable without unnecessary complexity
- map technical API errors to readable messages

Do not implement export before the parse/preview flow is genuinely working.

Commit + push P3 before P4.

# 11. P4 guidance — Export & Clipboard

Implement TXT, CSV, XLSX, JSON, and required clipboard modes entirely in the browser.

Test actual file contents.

Preserve:

- count
- order
- repeated entries
- Unicode
- multiple artists
- optional fields

Handle:

- CSV quoting/newlines/commas
- formula-like spreadsheet cells safely
- XLSX as explicit data values
- safe filenames
- emoji / CJK
- clipboard feedback

Do not upload export data to the Worker.

Commit + push P4 before P5.

# 12. P5 guidance — Anonymous Statistics

Implement the aggregate statistics defined in `ROADMAP.md`.

Expected direction:

- Cloudflare Web Analytics for richer owner-side traffic analytics
- D1 for tiny aggregate counters
- committed D1 migrations/schema
- success counter increments only after a complete successful parse
- analytics failures never fail the parse
- public stats, if shown, expose aggregate totals only

Absolutely do not write playlist URL/ID/content/song metadata/IP/user identity to D1.

Use the current authenticated Cloudflare environment when available to provision/apply the real D1 database and verify production behavior.

Commit + push P5 before P6.

# 13. P6 guidance — Security / Abuse

Keep protection proportional to a small free tool.

Implement practical limits and tests, not an enterprise security platform.

Important:

- rate limiting / bounded abuse control
- CORS
- method/input limits
- upstream allowlist
- timeout/pagination limits
- safe errors
- dependency review
- no secrets in repository/logs/responses

Do not add Turnstile/CAPTCHA unless simple protection is demonstrably insufficient.

Commit + push P6 before P7.

# 14. P7 guidance — Finished Product Polish

Turn the functional site into a finished public product.

Cover everything required by `ROADMAP.md`, including:

- desktop/mobile
- accessibility
- loading/error/empty/success polish
- large playlist usability
- coherent PlaylistOut branding
- supported-platform messaging
- privacy messaging/page
- title/meta description
- canonical URL
- Open Graph
- favicon
- robots/sitemap where appropriate
- GitHub/current-domain links
- browser validation

Do not hide incomplete core behavior behind pretty UI.

Commit + push P7 before P8.

# 15. P8 guidance — Production Deployment

Verify real production, not just local builds.

Target:

```text
https://playlistout.com
https://www.playlistout.com (canonical/redirect behavior)
https://api.playlistout.com
```

Required:

- Pages production deployment
- Worker production deployment
- D1 production binding + migrations
- Web Analytics verification
- HTTPS
- production CORS
- real-domain smoke test
- repeatable CI/CD documentation
- Worker deployment automation when credentials are available

Do not print or commit Cloudflare secrets.

If GitHub/Cloudflare credentials already exist in the environment, use them safely.

Commit + push P8 before P9.

# 16. External/manual blockers

This run should continue autonomously wherever technically possible.

Do not stop for minor design decisions or ordinary implementation choices.

If a phase contains an action that genuinely requires unavailable external credentials, account UI approval, billing confirmation, DNS ownership action, or permissions that the environment does not possess:

1. do all repository/code/test work that can be completed safely
2. document the exact external block
3. continue other non-dependent work where possible
4. never claim the blocked production action succeeded
5. P9 final status must be `BLOCKED` if the missing external action prevents truthful MVP acceptance

Do not create fake evidence.

# 17. P9 guidance — Final Independent Acceptance

Treat P9 as a fresh audit, not a ceremonial checkbox.

Re-read the constitution and entire roadmap.

Test the production system as a user would.

At minimum validate:

- small playlist
- medium playlist
- large playlist
- >1000 playlist
- repeated entries
- multiple artists
- Unicode
- special filename characters
- missing optional metadata

Perform a browser E2E flow:

```text
playlistout.com
→ paste
→ parse via production API
→ render
→ copy
→ TXT
→ CSV
→ XLSX
→ JSON
```

Inspect downloaded contents.

Also verify:

- statistics/privacy
- security boundaries
- rate limits do not break normal use
- mobile layout
- supported browsers where practical
- SEO/social metadata
- privacy page
- README/docs
- no stale false feature claims

Any release-blocking defect discovered in P9 must be fixed and the affected tests repeated before release.

# 18. v1.0.0 publication

Only after the final acceptance gate is genuinely satisfied:

- make versioning/release docs consistent with v1.0.0
- ensure release commit CI succeeds
- verify production Pages deployment
- verify production Worker deployment
- create tag `v1.0.0`
- create GitHub Release `v1.0.0`
- use truthful release notes

If tag/release creation is blocked only by permission, prepare exact release notes/checklist and report the permission block.

Do not publish a release while known release blockers remain.

# 19. Required regression commands

Use the repository's actual current scripts, but the final phase checks must cover the equivalent of:

```bash
# Python legacy CLI
python -m compileall cli/qqmusic/
python -m pytest -v cli/qqmusic/

# Web
npm --prefix web run typecheck
npm --prefix web test
npm --prefix web run build

# Worker
npm --prefix worker run typecheck
npm --prefix worker test
npm --prefix worker run build

# Real QQ validation
npm --prefix worker run test:live
```

Add targeted E2E/browser/export checks created during later phases.

Do not remove failing tests to pass.

# 20. Documentation discipline

Documentation must match shipped reality.

During the run:

- update README when product behavior actually changes
- document required local commands
- document supported QQ link types
- document privacy/statistics behavior
- document deployment requirements
- document real limitations

Do not mark later platforms as supported.

Do not claim production verification without actual evidence.

# 21. Final report format

At the very end, provide one consolidated report.

## Overall status

`PASS` or `BLOCKED`

## Phase history

Table with:

- Phase
- Result
- Commit SHA
- Pushed to main?
- CI result
- production/deployment evidence where relevant

Include P1 closure through P9.

## Final production state

Report:

- frontend production URL/status
- Worker production URL/version/status
- D1 migration/binding status
- Web Analytics status
- Pages deployment status
- Worker deployment automation status

## Final validation evidence

Include:

- deterministic test totals
- real QQ playlist matrix
- >1000 pagination evidence
- legitimate repeated-entry evidence
- browser/E2E matrix
- export matrix
- security/privacy checks
- statistics checks

## Release

Include:

- final release commit SHA
- `v1.0.0` tag status
- GitHub Release status
- release URL if actually published

## Known limitations

Only real non-blocking limitations.

## External/manual actions

List only actions that truly remain and explain why they could not be completed automatically.

# 22. Completion rule

Do not stop after merely writing code for all phases.

The goal is a **working, tested, production-deployed QQ Music MVP**.

Continue fixing problems discovered during the run until:

- each phase's acceptance gate is genuinely satisfied, or
- the only remaining blocker is a clearly documented external/manual dependency you cannot access.

Then produce the final report.
