# Playlist Out Public API Specification

> Governed by `docs/PROJECT-CONSTITUTION.md` and `docs/ROADMAP.md`.

## 1. Overview

The Playlist Out API is a lightweight, edge-native Cloudflare Worker that fetches, parses, and normalizes public music playlists into a platform-agnostic data model, serves anonymous aggregate product statistics, and ingests frontend telemetry events.

- **Production API base URL**: `https://api.playlistout.com`
- **Local development API base URL**: `http://localhost:8787`

---

## 2. Global API Invariants

1. **Explicit HTTP Methods**: Endpoints strictly enforce allowed HTTP methods:
   - `GET`: Information retrieval (`/health`, `/api/health`, `/api/playlist`, `/api/stats`).
   - `POST`: Write-only event ingestion (`/api/event`).
   - `OPTIONS`: CORS preflight across all routes.
   - Any other method returns `405 Method Not Allowed`.
2. **No Arbitrary Proxying**: Outbound network requests are strictly allowlisted to official upstream music endpoints (`c.y.qq.com`, `u.y.qq.com`). Any attempt to access `/proxy`, `/proxy/*`, or pass non-allowlisted targets is rejected with `403 Forbidden`.
3. **Strict Privacy Boundaries**:
   - **No Raw IP Storage**: Client IP is used in-memory for ephemeral rate limiting and geographic derivation, and is never persisted to D1.
   - **No Playlist URLs or IDs in Analytics**: Telemetry records coarse dimensions only; raw playlist URLs, IDs, and query strings are never stored in analytics tables.
   - **No Song or User Content Persistence**: Track titles, artists, album names, durations, lyrics, and user identifiers are transient and never stored in any database.
   - **No Full User-Agent Storage**: Only coarse classifications (device class, browser family, OS family) are recorded.
   - **No Authentication Tokens or Cookies**: The service requires no accounts, sessions, or credentials.
4. **Private Analytics Isolation**:
   - Detailed dimensional aggregates (hourly traffic, country/region distributions, client environment breakdown, latency buckets, error categories, provider path metrics) are stored in private D1 tables (`hourly_stats`, `daily_geo_stats`, `daily_client_stats`, `daily_performance_stats`, `daily_clipboard_stats`).
   - Private insights are strictly accessible to maintainers via direct D1 database access and are **never exposed through public unauthenticated endpoints**.
5. **Best-Effort Analytics**: Telemetry write failures never interrupt playlist parsing, export generation, or client responses.
6. **OWASP Security Headers**: All responses include defensive headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`).

---

## 3. Response Envelope Contract

### 3.1 Standard Success Envelope (`200 OK`)

Used by query endpoints (`/api/playlist`, `/api/stats`):

```json
{
  "success": true,
  "data": { ... }
}
```

### 3.2 Standard Error Envelope (`4xx` / `5xx`)

Returned on validation, rate-limiting, or server errors:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable safe explanation.",
    "details": { ... }
  }
}
```

### 3.3 Empty Success Response (`204 No Content`)

Returned by write-only telemetry endpoints (`POST /api/event`):

- HTTP Status: `204 No Content`
- Response Body: None (empty)

---

## 4. Stable Error Codes & HTTP Status Mapping

| Error Code | HTTP Status | Meaning / Trigger |
| :--- | :---: | :--- |
| `INVALID_INPUT` | `400` | Missing, empty, or malformed input, oversized body (> 1024 bytes for event, > 2048 chars for URL), invalid format, or out-of-range track count. |
| `UNSUPPORTED_URL` | `400` | Input is not recognized as a supported playlist URL. |
| `UNSUPPORTED_PLATFORM` | `400` | Platform is not in the supported provider allowlist (currently `qqmusic` only). |
| `FORBIDDEN` | `403` | Prohibited proxy attempt or unauthorized origin. |
| `PLAYLIST_NOT_FOUND` | `404` | Upstream playlist does not exist, is empty, or is private. |
| `NOT_FOUND` | `404` | Requested route does not exist. |
| `METHOD_NOT_ALLOWED` | `405` | HTTP method is not permitted on the target route. |
| `RATE_LIMITED` | `429` | Request rate limit exceeded. `Retry-After` header indicates wait duration in seconds. |
| `INTERNAL_ERROR` | `500` | Unexpected internal server error. Safe message returned without stack traces. |
| `INCOMPLETE_PLAYLIST` | `502` | Upstream returned fewer tracks than the reported total or pagination stalled. Fail-closed guarantee. |
| `UPSTREAM_ERROR` | `502` | Upstream music platform returned an error or malformed payload. |
| `PARSE_ERROR` | `502` | Failed to parse JSON response from upstream. |
| `UPSTREAM_TIMEOUT` | `504` | Upstream request timed out (> 15,000ms). |

---

## 5. Endpoints

### 5.1 Health Check

```http
GET /health
GET /api/health
```

Verifies that the Cloudflare Worker is operational.

#### Response (`200 OK`)

```json
{
  "status": "ok",
  "service": "playlistout-api",
  "version": "2.0.0"
}
```

---

### 5.2 Parse Playlist

```http
GET /api/playlist?url=<encoded_playlist_url_or_id>
```

Parses a public playlist from a supported music provider and returns a normalized track list.

#### Rate Limit

- **30 requests / minute** per client IP. Returns `429 RATE_LIMITED` when exceeded.

#### Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `url` | string | Yes | Public QQ Music playlist URL (e.g. `https://y.qq.com/n/ryqq/playlist/9044196528`, share links) or raw numeric playlist ID. Maximum 2048 characters. |

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "platform": "qqmusic",
    "id": "9044196528",
    "name": "民谣精选",
    "creator": "歌单达人",
    "coverUrl": "https://y.gtimg.cn/music/photo_new/...",
    "trackCount": 1,
    "tracks": [
      {
        "index": 1,
        "id": "003mN2sZ2...",
        "title": "南山南",
        "artists": ["马頔"],
        "album": "孤岛",
        "durationMs": 324000,
        "sourceUrl": "https://y.qq.com/n/ryqq/songDetail/003mN2sZ2..."
      }
    ]
  }
}
```

---

### 5.3 Public Aggregate Statistics

```http
GET /api/stats
```

Retrieves privacy-safe public aggregate statistics. Exposes macro activity numbers without revealing private dimensional breakdowns or user data.

#### Rate Limit

- **60 requests / minute** per client IP. Returns `429 RATE_LIMITED` when exceeded.

#### Export vs. Clipboard Semantics

- `totalExports`, `exportsToday`, and `recentDays[].exports` **strictly track file downloads** (`txt`, `csv`, `xlsx`, `json`).
- Clipboard copies are tracked separately in private counters (`clipboards_total`, `daily_clipboard_stats`) and **never count toward export totals**.

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "launchedAt": "2026-09-12",
    "totalPlaylistsParsed": 128,
    "playlistsParsedToday": 14,
    "totalTracksProcessed": 6420,
    "tracksProcessedToday": 710,
    "totalExports": 42,
    "exportsToday": 6,
    "byPlatform": {
      "qqmusic": {
        "totalSuccess": 128,
        "todaySuccess": 14
      }
    },
    "recentDays": [
      {
        "date": "2026-09-13",
        "parses": 14,
        "tracks": 710,
        "exports": 6
      }
    ],
    "generatedAt": "2026-09-13T08:33:00.000Z"
  }
}
```

#### Field Definitions

| Field | Type | Description |
| :--- | :--- | :--- |
| `launchedAt` | string | Official launch date of Playlist Out Web (`2026-09-12`). |
| `totalPlaylistsParsed` | number | All-time successful playlist parses across all platforms. |
| `playlistsParsedToday` | number | Successful playlist parses for the current UTC date. |
| `totalTracksProcessed` | number | All-time cumulative tracks processed from successful parses. |
| `tracksProcessedToday` | number | Tracks processed for the current UTC date. |
| `totalExports` | number | All-time cumulative file exports (TXT, CSV, XLSX, JSON). Excludes clipboards. |
| `exportsToday` | number | File exports for the current UTC date. Excludes clipboards. |
| `byPlatform` | object | Breakdown by platform (`totalSuccess`, `todaySuccess`). |
| `recentDays` | array | Rolling 30-day daily trend entries (`date`, `parses`, `tracks`, `exports`). |
| `generatedAt` | string | ISO 8601 UTC timestamp when the response was generated. |

---

### 5.4 Ingest Event (Telemetry)

```http
POST /api/event
```

Write-only analytics ingestion endpoint for client-side export and clipboard copy events. Validates payloads strictly, updates atomic aggregate counters asynchronously via `waitUntil`, and returns `204 No Content`.

#### Rate Limit

- **60 requests / minute** per client IP. Returns `429 RATE_LIMITED` when exceeded.

#### Request Headers

- `Content-Type: application/json`
- `Content-Length`: maximum 1024 bytes

#### Request Body Schema

```json
{
  "type": "export | clipboard",
  "platform": "qqmusic",
  "format": "string",
  "trackCount": 42
}
```

| Field | Type | Required | Allowed Values / Constraints |
| :--- | :--- | :---: | :--- |
| `type` | string | Yes | Strictly `"export"` or `"clipboard"`. |
| `platform` | string | Yes | Strictly `"qqmusic"` (must be in the supported provider allowlist). |
| `format` | string | Yes | Format must match the event `type`:<br>• When `type="export"`: strictly `"txt"`, `"csv"`, `"xlsx"`, `"json"`.<br>• When `type="clipboard"`: strictly `"title"`, `"title-artist"`, `"title-artist-album"`, `"title_artist"`, or `"title_artist_album"`. |
| `trackCount` | integer | No | Integer in range `[0, 50000]`. Negative numbers, floats, `NaN`, or values > 50,000 are rejected. |

#### Response (`204 No Content`)

- HTTP Status: `204 No Content`
- Response Body: empty

#### Failure Responses

- Method not allowed: `405 Method Not Allowed` with `Allow: POST, OPTIONS`
- Oversized payload (> 1024 bytes): `400 INVALID_INPUT`
- Malformed JSON / JSON array: `400 INVALID_INPUT`
- Unsupported platform (e.g. `netease`, `spotify`): `400 UNSUPPORTED_PLATFORM`
- Format mismatch (e.g. `type: "export"` with `format: "title"`): `400 INVALID_INPUT`
- Invalid `trackCount` (negative, float, or > 50,000): `400 INVALID_INPUT`

---

## 6. Examples

### 6.1 Parse Playlist Request & Response

**Request:**

```http
GET /api/playlist?url=https%3A%2F%2Fy.qq.com%2Fn%2Fryqq%2Fplaylist%2F9044196528 HTTP/1.1
Host: api.playlistout.com
Origin: https://playlistout.com
```

**Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "platform": "qqmusic",
    "id": "9044196528",
    "name": "民谣精选",
    "trackCount": 1,
    "tracks": [
      {
        "index": 1,
        "id": "003mN2sZ2...",
        "title": "南山南",
        "artists": ["马頔"],
        "album": "孤岛",
        "durationMs": 324000,
        "sourceUrl": "https://y.qq.com/n/ryqq/songDetail/003mN2sZ2..."
      }
    ]
  }
}
```

---

### 6.2 Public Statistics Request & Response

**Request:**

```http
GET /api/stats HTTP/1.1
Host: api.playlistout.com
Origin: https://playlistout.com
```

**Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "launchedAt": "2026-09-12",
    "totalPlaylistsParsed": 128,
    "playlistsParsedToday": 14,
    "totalTracksProcessed": 6420,
    "tracksProcessedToday": 710,
    "totalExports": 42,
    "exportsToday": 6,
    "byPlatform": {
      "qqmusic": {
        "totalSuccess": 128,
        "todaySuccess": 14
      }
    },
    "recentDays": [
      {
        "date": "2026-09-13",
        "parses": 14,
        "tracks": 710,
        "exports": 6
      }
    ],
    "generatedAt": "2026-09-13T08:33:00.000Z"
  }
}
```

---

### 6.3 Export Event Ingestion

**Request:**

```http
POST /api/event HTTP/1.1
Host: api.playlistout.com
Origin: https://playlistout.com
Content-Type: application/json

{
  "type": "export",
  "format": "xlsx",
  "platform": "qqmusic",
  "trackCount": 42
}
```

**Response (`204 No Content`):**

*(Empty body)*

---

### 6.4 Clipboard Event Ingestion

**Request:**

```http
POST /api/event HTTP/1.1
Host: api.playlistout.com
Origin: https://playlistout.com
Content-Type: application/json

{
  "type": "clipboard",
  "format": "title-artist",
  "platform": "qqmusic",
  "trackCount": 15
}
```

**Response (`204 No Content`):**

*(Empty body)*

---

### 6.5 Rate Limit Exceeded (`429 Too Many Requests`)

**Response (`429 Too Many Requests`):**

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 48

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please wait a moment before trying again."
  }
}
```

---

### 6.6 Arbitrary Proxy Prohibited (`403 Forbidden`)

**Request:**

```http
GET /proxy?url=https://example.com HTTP/1.1
Host: api.playlistout.com
```

**Response (`403 Forbidden`):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Arbitrary proxying is strictly prohibited by PlaylistOut Constitution."
  }
}
```

---

### 6.7 Unsupported Platform Rejection (`400 Bad Request`)

**Request:**

```http
POST /api/event HTTP/1.1
Host: api.playlistout.com
Content-Type: application/json

{
  "type": "export",
  "format": "csv",
  "platform": "netease",
  "trackCount": 20
}
```

**Response (`400 Bad Request`):**

```json
{
  "success": false,
  "error": {
    "code": "UNSUPPORTED_PLATFORM",
    "message": "Platform \"netease\" is not supported. Supported platforms: qqmusic."
  }
}
```

---

## 7. CORS Security Specification

Cross-Origin Resource Sharing (CORS) is restricted to explicit allowlisted origins:

- `https://playlistout.com` (Production canonical domain)
- `https://www.playlistout.com` (Production www domain)
- `http://localhost:5173` (Vite dev server)
- `http://127.0.0.1:5173` (Vite dev server)
- `http://localhost:4173` (Vite preview server)
- `http://127.0.0.1:4173` (Vite preview server)

For requests from allowlisted origins:
- Responses include `Access-Control-Allow-Origin: <origin>`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, and standard CORS headers.
- Preflight `OPTIONS` requests receive `204 No Content` with appropriate headers.

For requests from non-allowlisted origins:
- Requests do not receive `Access-Control-Allow-Origin` headers, causing the browser to block cross-origin access.
- Preflight `OPTIONS` requests receive `403 Forbidden`.
