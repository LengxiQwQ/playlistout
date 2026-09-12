# Changelog

All notable changes to **PlaylistOut** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-09-12

### Initial Stable Release (QQ Music MVP)

PlaylistOut 1.0.0 is the first production release of the lightweight, privacy-respecting online playlist export web tool and Cloudflare Worker API.

### Added

- **QQ Music Provider Core (P1)**:
  - Input parsing and normalization for QQ Music public playlist URLs and numeric/alphanumeric IDs.
  - Upstream data fetching with strict timeout controls (`15s`) and outbound host allowlists (`c.y.qq.com`, `u.y.qq.com`).
  - Automatic bounded pagination handling playlists with up to thousands of tracks (`MAX_PAGES = 50`, `PAGE_SIZE = 1000`).
  - Stalled pagination loop detection and data loss detection.
  - Normalized track representation (`index`, `id`, `title`, `artists`, `album`, `durationMs`).

- **Public API Contract & Reliability (P2)**:
  - Stable normalized response contract: `GET /api/playlist?url=...` and minimal health check `GET /api/health`.
  - Strict method enforcement (GET/OPTIONS only, `405 Method Not Allowed` on other methods).
  - Explicit rejection of arbitrary proxy URLs (`403 Forbidden`).
  - Strict CORS origin allowlisting (production canonical domain `playlistout.com` and local dev environments).
  - Safe error sanitization without leaking stack traces or internal secrets.

- **Complete Frontend Parse & Preview UX (P3)**:
  - Clean, focused interface: input -> parse -> preview -> export.
  - Client-side fast validation with comprehensive error messaging.
  - Stale request cancellation via `AbortController` preventing race conditions.
  - Accessible playlist summary card with metadata (name, creator, cover, track count).
  - High-performance, virtual-like track table rendering 1000+ tracks smoothly.

- **Browser-Local Multi-Format Export & Clipboard (P4)**:
  - 100% client-side export generation in TXT, CSV, Excel (.xlsx via SheetJS), and JSON.
  - Spreadsheet formula injection mitigation (sanitizing `=`, `+`, `-`, `@`, `\t`, `\r` with single-quote escaping).
  - Windows/macOS/Linux cross-platform filename sanitization.
  - One-click clipboard copy in three distinct formatting modes (Song Title, Title - Artist, Full Track Info).
  - Visual toast notification on copy actions.

- **Anonymous Aggregate Analytics (P5)**:
  - Cloudflare D1 integration with atomic counter increments (`daily_platform_stats`).
  - Strict privacy boundaries: zero playlist URLs, playlist IDs, track titles, or user identities recorded.
  - Best-effort analytics: database unavailability never breaks core parse or export functionality.
  - Public aggregate stats endpoint `GET /api/stats`.

- **Abuse Protection & Security Hardening (P6)**:
  - Per-IP rate limiting (30 req/min on parse, 60 req/min on stats) returning `429 RATE_LIMITED` with `Retry-After`.
  - OWASP security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`).
  - SSRF protection via outbound URL host checking and `redirect: 'error'`.

- **Product UI, Accessibility, SEO & Privacy Polish (P7)**:
  - Accessible privacy policy modal dialog detailing data practices in plain language.
  - Responsive mobile layout (<640px) with touch-friendly controls.
  - Accessible keyboard navigation with explicit `:focus-visible` rings.
  - Full SEO and social sharing metadata (Open Graph, Twitter Cards, canonical URL).
  - Production `robots.txt` and `sitemap.xml`.

- **Production Deployment & Continuous Delivery (P8)**:
  - GitHub Pages deployment for static frontend at `https://playlistout.com`.
  - Canonical domain routing and `www` 301 redirection.
  - Automated Cloudflare Worker deployment workflow (`deploy-worker.yml`).
  - Comprehensive manual setup and operations guide in `docs/MANUAL-SETUP.md`.

- **Preserved Classic Tooling**:
  - Maintained classic Python CLI in `cli/qqmusic/` with standalone tests passing.
