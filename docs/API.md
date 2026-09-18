# PlaylistOut Public API Specification (v1)

> Governed by `docs/PROJECT-CONSTITUTION.md` and `docs/ROADMAP.md`.

## 1. Overview

The **PlaylistOut Public API** is a high-performance, edge-native Cloudflare Worker API that extracts, parses, and normalizes public music playlists and user profile collections into a unified, platform-agnostic data contract.

- **Production API base URL**: `https://playlistout-api.lengxiqwq.com`
- **Local development API base URL**: `http://localhost:8787`

The Public API v1 powers both the official PlaylistOut web application and external developer integrations (CLI tools, desktop applications, migration utilities, and third-party web apps).

---

## 2. Supported Music Platforms

PlaylistOut officially supports 4 major music platforms:

| Platform Code | Name (ZH) | Name (EN) | Single Playlist | User Playlists | Ephemeral Auth |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `qqmusic` | QQ 音乐 | QQ Music | ✅ Yes (100% full) | ✅ Yes (QQ Number / Profile) | ❌ Not needed |
| `netease` | 网易云音乐 | NetEase Cloud Music | ✅ Yes (100% full) | ✅ Yes (UID / Profile) | ❌ Not needed |
| `kugou` | 酷狗音乐 | KuGou Music | ⚠️ 10-track preview (Zero-login)<br/>✅ 100% full (With Token Header) | ✅ Yes (Requires Token & Userid) | ✅ Supported (`Bearer` / `X-Kugou-*`) |
| `qishui` | 汽水音乐 | Soda Music | ✅ Yes (100% full) | ❌ N/A (Platform has no web profiles) | ❌ Not needed |


---

## 3. Global API Invariants & Security Boundaries

1. **Tiered CORS Policy**:
   - **Public GET Endpoints** (`/api/v1/resolve`, `/api/v1/playlist`, `/api/v1/user/playlists`, `/api/v1/stats`, `/api/v1/health`, and legacy query endpoints):
     - `Access-Control-Allow-Origin: *`
     - `Access-Control-Allow-Methods: GET, OPTIONS`
     - `Access-Control-Allow-Headers: Content-Type, Accept, Authorization, X-Kugou-Userid, X-Kugou-Token`
     - Allows third-party web applications running in browsers to call the Public API directly.
   - **Sensitive & Auth Endpoints** (`/api/kugou/*`):
     - Restricted to authorized PlaylistOut domains and localhost development environments.
   - **Maintainer Diagnostics Endpoint** (`GET /api/internal/stats`):
     - Explicitly closed to browser CORS (`Vary: Origin`, no `Access-Control-Allow-Origin`). Preflight OPTIONS requests are rejected with `403 Forbidden`.
     - Exclusively accessible by authorized server-side scripts (e.g. `scripts/utils/dashboard.py`) using Bearer Token authentication.
   - **Client Event Ingestion Endpoint** (`POST /api/event`):
     - Strictly restricted via an exact-match allowlist (`https://playlistout.com`, `https://www.playlistout.com`, `https://playlistout.lengxiqwq.com`, `https://lengxiqwq.github.io`, and approved dev ports).
     - Missing Origin, `Origin: null`, wildcards, and unauthorized subdomains receive `403 Forbidden` before any parsing or DB access.
2. **Zero-Trust Header-Only Authentication**:
   - Authentication tokens and credentials must **never** appear in URLs or query strings (`?token=...`, `?auth=...`, etc.). Any request containing credential query parameters is immediately rejected with `400 INVALID_INPUT`.
   - Third-party credentials (such as KuGou session tokens) are accepted exclusively via standard HTTP headers:
     - `Authorization: Bearer <token>`
     - `X-Kugou-Userid: <userid>`
   - The backend is 100% stateless: credentials are never stored in any server database or analytics record.
3. **No Arbitrary Proxying**:
   - Outbound requests are strictly allowlisted to official upstream music endpoints.
   - Any attempt to access `/proxy`, `/proxy/*`, or `/api/proxy` is rejected with `403 FORBIDDEN`.
4. **Rate Limiting & Abuse Boundaries**:
   - Public API sliding window:
     - `/api/v1/resolve`: **30 requests / minute** per client IP.
     - `/api/v1/playlist`: **30 requests / minute** per client IP.
     - `/api/v1/user/playlists`: **30 requests / minute** per client IP.
     - `/api/v1/stats`: **60 requests / minute** per client IP.
   - Telemetry Ingestion (`POST /api/event`):
     - Multi-tier rate limiting: in-memory burst guard + D1-backed durable rate bucket (**60 requests / minute** per client IP).
     - Keys are ephemeral salted one-way hashes (no raw IP stored).
     - Rate-limited rejections do NOT write to D1 (zero write amplification).
   - When exceeded, returns HTTP `429 Too Many Requests` with a `Retry-After: <seconds>` header.
5. **OWASP Security Headers**:
   - All responses include defensive headers:
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`

---

## 4. Response Envelope Contract

### 4.1 Standard Success Envelope (`200 OK`)

All successful data queries return a unified JSON envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

### 4.2 Standard Error Envelope (`4xx` / `5xx`)

All errors adhere to a consistent error schema:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation.",
    "details": { ... }
  }
}
```

---

## 5. Stable Error Codes & HTTP Status Mapping

| Error Code | HTTP Status | Meaning / Trigger |
| :--- | :---: | :--- |
| `INVALID_INPUT` | `400` | Missing, empty, or malformed input; query parameter exceeds 2048 chars; or credentials passed via query string. |
| `UNSUPPORTED_URL` | `400` | The input is not recognized as a supported music platform URL. |
| `UNSUPPORTED_PLATFORM` | `400` | Specified platform is not in the supported provider allowlist (`qqmusic`, `netease`, `kugou`, `qishui`). |
| `FORBIDDEN` | `403` | Prohibited arbitrary proxy attempt or unauthorized origin on sensitive endpoints. |
| `PLAYLIST_NOT_FOUND` | `404` | Playlist does not exist, is empty, is private, or could not be found. |
| `USER_NOT_FOUND` | `404` | User profile does not exist or has no public playlists. |
| `NOT_FOUND` | `404` | Requested route does not exist. |
| `METHOD_NOT_ALLOWED` | `405` | HTTP method is not permitted on the target route (use `GET`). |
| `AMBIGUOUS_INPUT` | `409` | Numeric input matched multiple targets across platforms or types. Use `&platform=` or `&type=` to disambiguate. |
| `RATE_LIMITED` | `429` | Request rate limit exceeded. Check `Retry-After` response header. |
| `INTERNAL_ERROR` | `500` | Unexpected internal server error. Safe message returned without stack traces. |
| `INCOMPLETE_PLAYLIST` | `502` | Upstream returned fewer tracks than reported total or pagination stalled. Fail-closed guarantee. |
| `UPSTREAM_ERROR` | `502` | Upstream music platform returned an error or malformed payload. |
| `PARSE_ERROR` | `502` | Failed to parse upstream response payload. |
| `UPSTREAM_TIMEOUT` | `504` | Upstream request timed out (> 15,000ms). |

---

## 6. Public API v1 Endpoints

### 6.1 Universal Search & Auto Resolver (Core Public API)

```http
GET /api/v1/resolve?q=<input>&type=auto&platform=auto
```

The flagship endpoint of PlaylistOut. It faithfully reproduces the server-side behavior of the website's universal search box:
1. Strips promotional copy, emojis, boundaries, and punctuation from share texts.
2. Identifies the input kind (single playlist, user profile, shortlink, or numeric ID).
3. Detects the platform (QQ Music, NetEase, KuGou, Qishui).
4. Concurrently probes for ambiguous numeric IDs and returns `409 AMBIGUOUS_INPUT` if multiple candidates match.
5. Returns a normalized result with light metadata wrappers (`kind`, `platform`, `result`).

#### Query Parameters

| Parameter | Type | Default | Required | Description |
| :--- | :--- | :---: | :---: | :--- |
| `q` | `string` | — | **Yes** | User input string (up to 2048 characters). Can be a web URL, mobile share link, shortlink, mixed share text, user profile URL, QQ number, NetEase UID, or raw numeric ID. |
| `type` | `string` | `auto` | No | Intent constraint: `auto`, `playlist` (single playlist), or `user` (user profile collections). |
| `platform` | `string` | `auto` | No | Platform constraint: `auto`, `qqmusic`, `netease`, `kugou`, or `qishui`. |

#### Response: Single Playlist (`kind: "playlist"`)

```json
{
  "success": true,
  "data": {
    "kind": "playlist",
    "platform": "qqmusic",
    "result": {
      "platform": "qqmusic",
      "id": "9044196528",
      "name": "民谣精选",
      "creator": "民谣小筑",
      "coverUrl": "https://y.gtimg.cn/music/photo_new/...",
      "trackCount": 100,
      "tracks": [
        {
          "index": 1,
          "id": "003mN2sZ2...",
          "title": "南山南",
          "artists": ["马頔"],
          "album": "孤岛",
          "durationMs": 324000,
          "isAvailable": true,
          "isVip": false,
          "status": "playable"
        }
      ]
    }
  }
}
```

#### Response: User Playlists (`kind: "user_playlists"`)

```json
{
  "success": true,
  "data": {
    "kind": "user_playlists",
    "platform": "netease",
    "result": {
      "platform": "netease",
      "userId": "1825474783",
      "nickname": "是冷汐呀233",
      "total": 5,
      "playlists": [
        {
          "id": "2756674066",
          "name": "是冷汐呀233喜欢的音乐",
          "coverUrl": "https://p1.music.126.net/...",
          "trackCount": 2984,
          "listenNum": 12500,
          "sourceUrl": "https://music.163.com/#/playlist?id=2756674066"
        }
      ]
    }
  }
}
```

#### Response: Ambiguous Numeric Input (`409 Conflict`)

When a numeric ID matches multiple candidates across platforms or types in `auto` mode:

```json
{
  "success": false,
  "error": {
    "code": "AMBIGUOUS_INPUT",
    "message": "Numeric ID matched multiple targets across platforms/types. Please specify &platform= and/or &type= to disambiguate.",
    "details": {
      "candidates": [
        {
          "id": "12345678",
          "kind": "playlist",
          "platform": "qqmusic",
          "title": "古典流行精选",
          "subtitle": "创建者: 乐评人",
          "trackCount": 50,
          "coverUrl": "https://..."
        },
        {
          "id": "12345678",
          "kind": "user_playlists",
          "platform": "netease",
          "title": "网易云用户 (12345678)",
          "subtitle": "包含 8 个公开歌单",
          "trackCount": 8,
          "coverUrl": "https://..."
        }
      ]
    }
  }
}
```

---

### 6.2 Parse Single Playlist

```http
GET /api/v1/playlist?url=<url_or_id>&platform=<optional>
GET /api/v1/playlist?id=<id>&platform=<optional>
```

Parses a single public playlist from a supported music provider and returns the normalized `Playlist` contract.

#### Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `url` / `id` | `string` | **Yes** | Public playlist URL, shortlink, or raw playlist ID. |
| `platform` | `string` | No | Target platform: `qqmusic`, `netease`, `kugou`, `qishui`. Required when passing raw numeric IDs that belong to non-QQ platforms. |

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "platform": "netease",
    "id": "2756674066",
    "name": "喜欢的音乐",
    "creator": "冷汐",
    "coverUrl": "https://p1.music.126.net/...",
    "trackCount": 50,
    "tracks": [ ... ]
  }
}
```

---

### 6.3 Fetch User Playlists Collection

```http
GET /api/v1/user/playlists?uid=<user_id_or_profile_url>&platform=<optional>
GET /api/v1/user/playlists?uin=<qq_uin>&platform=<optional>
GET /api/v1/user/playlists?id=<user_id>&platform=<optional>
```

Retrieves all public playlists created by a specific user.

#### Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `uid` / `uin` / `id` / `url` | `string` | **Yes** | User QQ number, NetEase UID, KuGou ID, or user profile URL. |
| `platform` | `string` | No | Target platform: `qqmusic`, `netease`, `kugou`. |

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "platform": "qqmusic",
    "userId": "3197635836",
    "nickname": "冷汐",
    "total": 3,
    "playlists": [ ... ]
  }
}
```

---

### 6.4 Anonymous Aggregate Statistics

```http
GET /api/v1/stats
```

Returns coarse, privacy-preserving aggregate statistics (parses, tracks, exports, platform distribution, and visitor metrics).

> 🛡️ **Privacy Notice on Visitor Metrics**: PlaylistOut deliberately avoids cross-day visitor identity tracking to maximize user privacy. Deduplication is performed strictly within individual UTC days (`visitorsToday`). The cumulative visitor metric (`cumulativeDailyVisitors`) represents the sum of daily unique visitor counts; the same visitor may be counted again across different days.

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "launchedAt": "2026-09-12",
    "cumulativeDailyVisitors": 316,
    "totalVisitors": 316,
    "visitorsToday": 110,
    "totalPageViews": 2297,
    "pageViewsToday": 911,
    "totalPlaylistsParsed": 1250,
    "playlistsParsedToday": 326,
    "totalTracksProcessed": 105400,
    "tracksProcessedToday": 8921,
    "totalExports": 860,
    "exportsToday": 95,
    "byPlatform": {
      "qqmusic": { "totalSuccess": 600, "todaySuccess": 326 },
      "netease": { "totalSuccess": 450, "todaySuccess": 0 },
      "kugou": { "totalSuccess": 120, "todaySuccess": 0 },
      "qishui": { "totalSuccess": 80, "todaySuccess": 0 }
    }
  }
}
```

#### Key Visitor Metric Definitions

| Field | Type | Description |
| :--- | :---: | :--- |
| `cumulativeDailyVisitors` | `number` | **Canonical metric**: Cumulative Daily Unique Visits (累计日独立访问人次). Sum of daily deduplicated visitor counts. Does not perform cross-day tracking. |
| `totalVisitors` | `number` | **Deprecated compatibility alias** for `cumulativeDailyVisitors`. Semantically identical; guaranteed equal to `cumulativeDailyVisitors`. NOT an all-time globally unique person count. |
| `visitorsToday` | `number` | Daily Unique Visitors (今日独立访客). Coarse-grained count deduplicated within the current UTC day via anonymous salted cryptographic hash. |

#### Hourly Traffic Metrics

| Field | Type | Description |
| :--- | :---: | :--- |
| `todayHourlyPageViews` | `HourlyEntry[]` | Legacy compatibility field: 24 buckets for the current **UTC calendar day** (hours 0–23). Do not treat this as a rolling 24-hour window. |
| `last24HourlyPageViews` | `RollingHourlyEntry[]` | Preferred field: exactly 24 hourly buckets ordered oldest → newest, ending at the current UTC hour. Each item contains a UTC ISO `timestamp`, `pageViews`, and `visitors`. The current hour may be partial. |

> Time contract: analytics storage buckets are UTC. Dashboards should convert `last24HourlyPageViews[].timestamp` only for display (for example Malaysia UTC+8, UTC, or browser-local time) and must not reorder the buckets after conversion.

#### Geographic Distribution Metrics (`topGeo` and `chinaProvinces`)

| Field | Type | Description |
| :--- | :---: | :--- |
| `topGeo` | `GeoDistributionItem[]` | Top 10 countries ranked by recorded visit events. Excludes `country = 'UNKNOWN'`. |
| `topGeo[].percentage` | `number` | Integer percentage share among **all known geographic visit records** (`country != 'UNKNOWN'`), NOT the share within the returned Top 10 rows. When traffic outside Top 10 exists, sum of percentages is `< 100%`. |
| `chinaProvinces` | `ProvinceDistributionItem[]` | Top 10 mainland China provinces/regions ranked by recorded visit events. Excludes `region = 'UNKNOWN'`. |
| `chinaProvinces[].percentage` | `number` | Integer percentage share among **all known China province visit records** (`country = 'CN' AND region != 'UNKNOWN'`), NOT the share within the returned Top 10 rows. |

---

### 6.5 Health Check

```http
GET /api/v1/health
```

#### Response (`200 OK`)

```json
{
  "status": "ok",
  "service": "playlistout-api",
  "version": "2.0.0"
}
```

---

## 7. Backward-Compatible Endpoints

For backward compatibility with existing frontends, bookmarks, and automated scripts, the following legacy routes remain permanently supported with identical logic:

- `GET /api/playlist` ➔ Alias to `GET /api/v1/playlist`
- `GET /api/user/playlists` ➔ Alias to `GET /api/v1/user/playlists`
- `GET /api/stats` ➔ Alias to `GET /api/v1/stats`
- `GET /health` & `GET /api/health` ➔ Alias to `GET /api/v1/health`

---

## 7.5 Frontend Event Ingestion & Client Trust Boundary (`POST /api/event`)

### Overview
`POST /api/event` is an internal telemetry ingestion endpoint used exclusively by official PlaylistOut frontend clients for recording aggregate anonymous statistics (export formats, clipboard copy modes, and page visits).

### Client Event Trust Boundary & Analytics Trust Levels
In public Single Page Applications (SPAs) without mandatory user login or hardware attestation, browser telemetry cannot achieve absolute cryptographic authenticity. PlaylistOut enforces a realistic, honest trust model:

| Data Element | Source | Trust Level | Description |
| :--- | :--- | :--- | :--- |
| **Client IP** | Cloudflare Edge (`CF-Connecting-IP`) | **Server-derived** | Determined by the edge network. `X-Forwarded-For` is strictly ignored for security identity. |
| **User-Agent** | Request Header | **Server-observed** | Inspected by the server and parsed into coarse categories (desktop/mobile, browser family). Full UA strings are never persisted. |
| **Geography** | Cloudflare (`request.cf`) | **Server-derived** | Country, region, and city derived by Cloudflare GeoIP at ingestion time. |
| **Platform** | Client JSON payload | **Validated Client-Reported** | Strictly validated against allowlist (`qqmusic`, `netease`, `kugou`, `qishui`). |
| **Format / Mode** | Client JSON payload | **Validated Client-Reported** | Strictly validated against platform/format schemas. |
| **Track Count** | Client JSON payload | **Bounded Client-Reported** | Bounded integer between `0` and `50,000`. Telemetry metric only, not server truth. |
| **Referrer Source** | Browser Client Classifier | **Validated Client-Reported** | Coarse acquisition category classified client-side before transmission (`chatgpt`, `google`, `github`, `direct`, `other_web`, etc.). Raw `document.referrer` URLs, paths, search queries, fragments, and raw campaign values are NEVER transmitted in telemetry. Unknown or invalid categories are rejected with `400 INVALID_INPUT`. |

### Security Invariants for `/api/event`
1. **Event Origin Gate (Browser Boundary)**:
   - Only exact official origins (`https://playlistout.com`, `https://www.playlistout.com`, `https://playlistout.lengxiqwq.com`, `https://lengxiqwq.github.io`, and approved local dev ports) are permitted.
   - Missing Origin, `Origin: null`, wildcards, or unauthorized subdomains (e.g. `foo.lengxiqwq.com`, `fake.playlistout.com`) receive `403 FORBIDDEN` before any database access or body parsing.
   - *Note*: Origin validation is a browser cross-origin boundary, not cryptographic authentication.
2. **No Client-Driven UV Inflation**:
   - Client `deviceId` is strictly prohibited and rejected with `400 INVALID_INPUT` if present.
   - Daily unique visitors are deduplicated strictly via server-derived connection IP, server-observed UA signal, date, and salt.
3. **Data Minimization Before Transmission (Referrer Minimization)**:
   - Full `document.referrer` URLs, paths, search queries, fragments, and raw campaign parameters NEVER cross the network boundary.
   - Client performs coarse classification in-browser and transmits only `referrerSource` from a strict finite enum allowlist.
   - Legacy `referrer` field is strictly rejected with `400 INVALID_INPUT`.
   - Unknown/unrecognized categories are rejected with generic `400 INVALID_INPUT` without echoing invalid inputs.
4. **Strict JSON & Schema Guard**:
   - `Content-Type` must be `application/json`.
   - Body size must not exceed 1024 bytes (verified by chunked streaming reader).
   - Any unknown/extra fields trigger `400 INVALID_INPUT`.
5. **Cross-Isolate Durable Abuse Control**:
   - Fast in-memory burst guard + D1-backed ephemeral rate bucket (`60 requests / minute`).
   - Rate limit keys are short-lived salted one-way hashes (no raw IP stored).
   - Rate-limited rejections (429) do not write to D1 (zero write amplification).
6. **Fail-Safe Operation**:
   - Analytics ingestion failures never disrupt user actions (returns `204 No Content`).
   - If the rate limiter database experiences an outage, it fails closed on telemetry writes (0 events recorded) while returning `204` to the client.

---

## 8. KuGou Ephemeral Authentication & Upstream Constraints

### 8.1 Upstream Constraint Background

Unlike QQ Music and NetEase Cloud Music, KuGou Music enforces strict anti-scraping and app-funneling measures on its web ecosystem:
1. **Public H5 Share Pages (`m.kugou.com/songlist/...`)**: KuGou embeds only the **first 10 tracks** in the SSR HTML (`window.$output.info.songs`). All pagination and AJAX APIs (e.g. `mobilecdn.kugou.com/api/v3/songlist/...`) return `Access Deny !!!` to unauthenticated clients, intentionally forcing users to open their mobile App to view further songs.
2. **User Profile Playlists**: KuGou provides no public, unauthenticated web profile pages for user playlist collections. The user playlist API (`cloudlist.service.kugou.com`) resides on KuGou's authenticated mobile gateway.

### 8.2 PlaylistOut Retrieval Model for KuGou

To handle this restriction gracefully without breaking or crashing:
- **Zero-Login Public Preview**: When queried without credentials, PlaylistOut returns the 10 preview tracks, marks `trackCount` with the true total count (e.g. `417`), and tags the response envelope with:
  ```json
  "retrieval": {
    "mode": "preview",
    "reason": "auth_required"
  }
  ```
- **Full Unlock via Token**: When the creator's session credentials (`token` and `userid`) are attached, PlaylistOut authenticates against KuGou's mobile cloudlist gateway, retrieving **100% of all tracks** (up to 15,000 tracks with automatic batch pagination).

### 8.3 Providing Credentials in API Calls

Credentials must be supplied exclusively via standard HTTP headers. **Never pass tokens in query strings** (`?token=...` is rejected with `400 INVALID_INPUT`):

- `Authorization: Bearer <kugou_token>` (or `X-Kugou-Token: <kugou_token>`)
- `X-Kugou-Userid: <kugou_userid>`

### 8.4 Obtaining KuGou Credentials

- **In the Web UI**:
  - **Desktop / Tablets**: Click "连接酷狗账号" to display a dynamic QR code. Scan using the official KuGou App on your phone.
  - **Mobile Phones**: Directly click "跳转酷狗 App 一键登录" (One-click App Jump). This opens the KuGou mobile app via deep link (`kugouURL://...`) to confirm login immediately on the same device without needing a second screen.
  - **Developer API Credentials Panel**: Once connected, the modal displays a "开发者 API 凭证" card where you can one-click copy:
    - Ready-to-run **cURL Command** (including `Authorization: Bearer ...` and `X-Kugou-Userid: ...`)
    - Raw **Token** string
    - Raw **UserID** string
- **In Third-Party Client Applications**:
  1. `GET /api/kugou/login/qr` — Requests a new QR code session (`qrcode`, `qrcode_img`).
  2. `GET /api/kugou/login/check?qrcode=<qrcode>` — Polls until scan confirmed (`status: 4`), returning `{ token, userid }`.
  3. Pass `{ token, userid }` in subsequent request headers.


---

## 9. Code Examples for Developers

### 9.1 cURL

#### Universal Resolver — Single Playlist
```bash
curl -s "https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://y.qq.com/n/ryqq/playlist/9044196528"
```

#### Universal Resolver — NetEase Playlist via App Share Text
```bash
curl -s "https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=%E5%88%86%E4%BA%AB%E6%AD%8C%E5%8D%95%20https://163cn.tv/bgpHWLfw"
```

#### Universal Resolver — Soda Music (汽水音乐) Share Link
```bash
curl -s "https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://qishui.douyin.com/s/iXHhKHhY/"
```

#### Universal Resolver — Numeric ID with Explicit Disambiguation
```bash
curl -s "https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=2756674066&type=playlist&platform=netease"
```

#### KuGou Playlist with Ephemeral Token Headers (Universal Resolver)
```bash
curl -s "https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://www.kugou.com/songlist/gcid_3zr52qfrzaz06a/" \
  -H "Authorization: Bearer YOUR_KUGOU_TOKEN" \
  -H "X-Kugou-Userid: YOUR_KUGOU_USERID"
```

#### KuGou User Profile Playlists Collection
```bash
curl -s "https://playlistout-api.lengxiqwq.com/api/v1/user/playlists?uid=YOUR_KUGOU_USERID&platform=kugou" \
  -H "Authorization: Bearer YOUR_KUGOU_TOKEN" \
  -H "X-Kugou-Userid: YOUR_KUGOU_USERID"
```

#### KuGou Single Playlist (Direct Endpoint)
```bash
curl -s "https://playlistout-api.lengxiqwq.com/api/v1/playlist?url=https://m.kugou.com/songlist/gcid_3zr52qfrz2z063/?src_cid=1000&uid=YOUR_KUGOU_USERID&platform=kugou" \
  -H "Authorization: Bearer YOUR_KUGOU_TOKEN" \
  -H "X-Kugou-Userid: YOUR_KUGOU_USERID"
```

---

### 9.2 JavaScript / TypeScript (`fetch`)

```typescript
interface ResolveResponse<T = unknown> {
  success: boolean;
  data?: {
    kind: 'playlist' | 'user_playlists';
    platform: 'qqmusic' | 'netease' | 'kugou' | 'qishui';
    result: T;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

async function resolveMusicInput(input: string): Promise<void> {
  const url = new URL('https://playlistout-api.lengxiqwq.com/api/v1/resolve');
  url.searchParams.set('q', input);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const data: ResolveResponse = await response.json();

  if (!data.success) {
    if (data.error?.code === 'AMBIGUOUS_INPUT') {
      console.warn('Multiple candidates matched:', data.error.details);
      // Prompt user to specify platform or type
    } else {
      console.error('Resolution error:', data.error?.message);
    }
    return;
  }

  if (data.data?.kind === 'playlist') {
    const playlist = data.data.result as any;
    console.log(`[${data.data.platform}] ${playlist.name} (${playlist.tracks.length} tracks)`);
  } else if (data.data?.kind === 'user_playlists') {
    const user = data.data.result as any;
    console.log(`[${data.data.platform}] User ${user.nickname} has ${user.playlists.length} playlists`);
  }
}

// Example calls
resolveMusicInput('https://music.163.com/#/playlist?id=2756674066');
resolveMusicInput('QQ: 3197635836');
```

---

### 9.3 Python (`requests`)

```python
import requests

API_BASE = "https://playlistout-api.lengxiqwq.com/api/v1"

def resolve_input(query: str, target_type: str = "auto", platform: str = "auto"):
    params = {
        "q": query,
        "type": target_type,
        "platform": platform,
    }
    response = requests.get(f"{API_BASE}/resolve", params=params, timeout=15)
    data = response.json()
    
    if not data.get("success"):
        error = data.get("error", {})
        code = error.get("code")
        if code == "AMBIGUOUS_INPUT":
            print("Ambiguous input! Candidates:", error.get("details", {}).get("candidates"))
        else:
            print(f"Error [{code}]: {error.get('message')}")
        return None
        
    result_data = data["data"]
    kind = result_data["kind"]
    platform_name = result_data["platform"]
    result = result_data["result"]
    
    if kind == "playlist":
        print(f"[{platform_name}] Playlist: '{result.get('name')}' ({len(result.get('tracks', []))} tracks)")
    elif kind == "user_playlists":
        print(f"[{platform_name}] User: '{result.get('nickname')}' ({len(result.get('playlists', []))} playlists)")
        
    return result

if __name__ == "__main__":
    # 1. Parse QQ Music Playlist
    resolve_input("https://y.qq.com/n/ryqq/playlist/9044196528")
    
    # 2. Parse Qishui Shortlink
    resolve_input("https://qishui.douyin.com/s/iXHhKHhY/")
    
    # 3. Disambiguate Numeric ID
    resolve_input("2756674066", target_type="playlist", platform="netease")

    # 4. Parse KuGou Playlist with Token to unlock 100% full tracks
    headers = {
        "Authorization": "Bearer YOUR_KUGOU_TOKEN",
        "X-Kugou-Userid": "YOUR_KUGOU_USERID"
    }
    res = requests.get(
        f"{API_BASE}/resolve",
        params={"q": "https://m.kugou.com/songlist/gcid_3zr52qfrz2z063/?src_cid=1000&uid=1425711902"},
        headers=headers,
        timeout=15
    )
    print("KuGou Full Response:", res.json())
```

---

## 10. Product Statistics & Maintainer Analytics Specification

Governed by `docs/PROJECT-CONSTITUTION.md` Section 7 & 9 and `docs/ROADMAP.md` Milestone R6.

PlaylistOut enforces a strict separation between **Public Product Statistics** (intended for public transparency, the open web frontend, and GitHub README stats) and **Private Maintainer Analytics** (intended strictly for operational engineering diagnostics and capacity planning).

### 10.1 Public Statistics (`GET /api/stats` & `GET /api/v1/stats`)

- **Authentication**: None (open public endpoint).
- **CORS**: `Access-Control-Allow-Origin: *` (unrestricted browser access).
- **Cache-Control**: Edge cached (typically `max-age=60`).
- **Privacy Boundary**: Executes zero private queries. Leaks zero geographic, provincial, client-device, hourly, or internal operational dimensions.
- **Response Schema (`PublicStatsResponse`)**:
  ```json
  {
    "success": true,
    "data": {
      "launchedAt": "2026-09-12",
      "cumulativeDailyVisitors": 343,
      "totalVisitors": 343,
      "visitorsToday": 15,
      "totalPageViews": 2655,
      "pageViewsToday": 147,
      "totalPlaylistsParsed": 190,
      "playlistsParsedToday": 5,
      "totalTracksProcessed": 64893,
      "tracksProcessedToday": 1602,
      "totalExports": 641,
      "exportsToday": 36,
      "exportFormatsBreakdown": { "xlsx": 412, "txt": 204, "csv": 15, "json": 10 },
      "byPlatform": {
        "qqmusic": { "totalSuccess": 134, "todaySuccess": 3 },
        "netease": { "totalSuccess": 20, "todaySuccess": 1 },
        "kugou": { "totalSuccess": 28, "todaySuccess": 1 },
        "qishui": { "totalSuccess": 8, "todaySuccess": 0 }
      },
      "recentDays": [
        { "date": "2026-09-18", "parses": 5, "tracks": 1602, "exports": 36 }
      ],
      "generatedAt": "2026-09-18T14:30:00.000Z"
    }
  }
  ```

### 10.2 Maintainer Diagnostics (`GET /api/internal/stats`)

- **Authentication**: Required via HTTP Header:
  ```http
  Authorization: Bearer <INSIGHTS_ADMIN_TOKEN>
  ```
  Verification uses constant-time cryptographic hash comparison (`crypto.subtle.digest` SHA-256) to eliminate timing side-channels.
- **Fail-Closed Behavior**: If `INSIGHTS_ADMIN_TOKEN` is not set on the server, the endpoint immediately returns `503 Service Unavailable` without accessing D1.
- **Unauthorized Rejections**: Invalid or missing credentials return `401 Unauthorized` without querying the database.
- **CORS**: Browser access is completely blocked (`Vary: Origin`, preflight OPTIONS returns `403 Forbidden`).
- **Cache-Control**: `no-store, no-cache, must-revalidate`, `Pragma: no-cache`.
- **Response Schema (`MaintainerStatsResponse`)**:
  ```json
  {
    "success": true,
    "data": {
      "public": { ... /* PublicStatsResponse */ },
      "insights": {
        "todayHourlyPageViews": [ ... ],
        "last24HourlyPageViews": [ ... ],
        "topGeo": [ ... ],
        "chinaProvinces": [ ... ],
        "clientStats": { "browsers": [ ... ], "devices": [ ... ], "os": [ ... ], "deviceBrands": [ ... ] },
        "clipboardFormatsBreakdown": { ... },
        "referrerDistribution": [ ... ],
        "inputTypeDistribution": [ ... ],
        "latencyDistribution": [ ... ],
        "errorCategoryDistribution": [ ... ],
        "playlistSizeDistribution": [ ... ],
        "providerPathDistribution": [ ... ],
        "exportPlaylistSizeDistribution": [ ... ],
        "clipboardPlaylistSizeDistribution": [ ... ],
        "rateLimitEndpointDistribution": [ ... ],
        "operationalRecentDays": [
          { "date": "2026-09-18", "clipboards": 12, "visitors": 15, "failures": 1 }
        ],
        "resolveOutcomeDistribution": [ ... ],
        "resolveFailureCodeDistribution": [ ... ],
        "resolveFailureClassDistribution": [ ... ],
        "resolveFailureStageDistribution": [ ... ],
        "resolveRequestedTypeDistribution": [ ... ],
        "resolveRequestedPlatformDistribution": [ ... ],
        "resolveInputTypeDistribution": [ ... ],
        "resolveFailuresByPlatform": [ ... ],
        "providerFailurePathDistribution": [ ... ]
      }
    }
  }
  ```
- **Consumer**: Exclusively consumed by the maintainer's local dashboard tool (`python scripts/utils/dashboard.py`). Token is read from environment variable or `.dev.vars` and is never rendered into output HTML or logs.

### 10.3 Resolve Failure Telemetry (Milestone R7 — Private Maintainer Observability)

To enable maintainers to diagnose search and resolve anomalies without compromising user privacy, PlaylistOut implements **Resolve Failure Telemetry** governed by the following core invariants:

1. **Strict Privacy Boundary**:
   - **Zero Raw Input Logging**: Raw input strings (`q`), normalized URLs, playlist IDs, user IDs, auth tokens, song metadata, and raw exception messages (`err.message`, `ProviderError.details`) are **never stored** in D1 or printed to transaction logs.
   - **Bounded Enum Taxonomies**: Every telemetry dimension is strictly mapped to finite bounded sets before persistence. Unrecognized codes default safely to `'internal_error'`, `'finalization'`, or `'unknown'`.

2. **Authoritative Exactly-Once Final Outcome**:
   - Every invocation of `GET /api/v1/resolve` records exactly one final outcome:
     - `success_playlist`: Single playlist successfully resolved.
     - `success_user`: User profile successfully resolved (does NOT increment song track counts or fake parse counts).
     - `failure`: Terminal resolution failure.
   - **Silent Internal Probes**: Disambiguation probes executed during multi-provider probing pass `skipAnalytics: true` and never write intermediate parse records or inflate failure counters.

3. **8 True D1 Storage Dimensions (`daily_performance_stats`)**:
   - **`resolve_outcome`**: `success_playlist`, `success_user`, `failure`.
   - **`resolve_failure_code`**: `invalid_input`, `unsupported_url`, `unsupported_platform`, `playlist_not_found`, `user_not_found`, `upstream_error`, `upstream_timeout`, `incomplete_playlist`, `parse_error`, `forbidden`, `rate_limited`, `ambiguous_input`, `internal_error`.
   - **`resolve_failure_class`**: `input`, `not_found`, `ambiguous`, `auth`, `upstream`, `timeout`, `incomplete`, `parse`, `internal`.
   - **`resolve_failure_stage`**: `input_validation`, `routing`, `short_link_resolution`, `playlist_resolution`, `user_resolution`, `disambiguation_probe`, `provider_fetch`, `finalization`.
   - **`resolve_requested_type`**: `auto`, `playlist`, `user`, `unknown`.
   - **`resolve_requested_platform`**: `auto`, `qqmusic`, `netease`, `kugou`, `qishui`, `unknown`.
   - **`resolve_input_type`**: `web_url`, `mobile_share_link`, `raw_id`, `other`.
   - **`provider_failure_path`**: Upstream execution path for failed provider requests: `primary`, `fallback`, `both`, `not_applicable`, `unknown`.

4. **Derived View — Failures by Platform (`resolveFailuresByPlatform`)**:
   - Aggregated dynamically at query time (`SELECT platform, SUM(count) FROM daily_performance_stats WHERE dimension = 'resolve_outcome' AND value = 'failure' GROUP BY platform`), NOT stored as a separate D1 dimension. Returns failure counts grouped by target platform (`qqmusic`, `netease`, `kugou`, `qishui`, `unknown`).

5. **Global Parse Failure Convergence**:
   - Direct playlist parse failures record both platform-specific and `platform = 'all'` rows in `aggregate_stats`, ensuring `operationalRecentDays.failures` accurately reflects aggregate operational health.

6. **R6 Boundary Preservation**:
   - All R7 telemetry dimensions, distribution lists, and dashboard cards are **strictly private** (`GET /api/internal/stats`). Public endpoints (`GET /api/stats`, `GET /api/v1/stats`), `traffic.json`, and the public README omit all R7 keys.



