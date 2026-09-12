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

# 2. Provider expansion lane

The next major product step is adding more music-platform providers behind the existing normalized contract.

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

# 3. Product improvements — later / optional

These are possible future improvements, not current commitments:

- M3U / M3U8 export
- selectable export fields
- client-side search/filter for parsed tracks
- batch playlist parsing
- richer but still aggregate public statistics
- direct platform-to-platform migration where technically and legally appropriate

Do not add these opportunistically during unrelated maintenance work. Promote an item into an explicit milestone first.

---

# 4. Release and validation rules

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

# 5. Historical roadmap policy

Completed delivery plans should be treated as release history, not kept indefinitely as active task lists.

The v2.0.0 P0–P9 roadmap is frozen at the `v2.0.0` tag. Future completed major roadmaps should be archived the same way so `docs/ROADMAP.md` always describes what comes next rather than what has already shipped.
