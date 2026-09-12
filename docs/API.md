# PlaylistOut Public API Specification

> Defined in Phase 2 of `ROADMAP.md` and governed by `PROJECT-CONSTITUTION.md`.

## 1. Overview

The PlaylistOut API is a lightweight, read-only Cloudflare Worker that fetches, parses, and normalizes public music playlists into a platform-agnostic data model for client-side processing and export.

- **Production API base URL**: `https://api.playlistout.com`
- **Local development API base URL**: `http://localhost:8787`

---

## 2. Global API Invariants

1. **Read-Only / GET Only**: Endpoints accept `GET` requests (and `OPTIONS` for CORS preflight). Other HTTP methods return `405 Method Not Allowed`.
2. **No Arbitrary Proxying**: Upstream requests are strictly allowlisted to official platform endpoints. Requests to `/proxy` or arbitrary caller URLs are rejected with `403 Forbidden`.
3. **No User Content Persistence**: Playlist URLs, track contents, and user identities are transient processing data and are never persisted to a database or disk.
4. **Normalized JSON Responses**: All responses follow a unified response envelope with explicit status codes.

---

## 3. Response Envelope Contract

Every response returns JSON with a top-level `success` boolean.

### Success Response (`200 OK`)

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response (`4xx` / `5xx`)

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

---

## 4. Stable Error Codes & HTTP Status Mapping

| Error Code | HTTP Status | Meaning / Trigger |
| :--- | :---: | :--- |
| `INVALID_INPUT` | `400` | Missing, empty, or oversized (> 2048 chars) input parameter. |
| `UNSUPPORTED_URL` | `400` | Input is not recognized as a supported QQ Music playlist URL. |
| `FORBIDDEN` | `403` | Prohibited proxy attempt or unauthorized origin. |
| `PLAYLIST_NOT_FOUND` | `404` | Upstream playlist does not exist, is empty, or is set to private. |
| `METHOD_NOT_ALLOWED` | `405` | Request method other than `GET` or `OPTIONS`. |
| `INCOMPLETE_PLAYLIST` | `502` | Upstream returned fewer tracks than the reported total or pagination stalled. Fail-closed guarantee. |
| `UPSTREAM_ERROR` | `502` | Upstream music platform returned a non-zero error code or malformed body. |
| `UPSTREAM_TIMEOUT` | `504` | Upstream request timed out (> 15000ms). |
| `INTERNAL_ERROR` | `500` | Unexpected internal server error. Safe message returned without stack traces. |

---

## 5. Endpoints

### 5.1 Health Check

```http
GET /health
GET /api/health
```

#### Response Example (`200 OK`)

```json
{
  "status": "ok",
  "service": "playlistout-api",
  "version": "0.1.0"
}
```

---

### 5.2 Parse Playlist

```http
GET /api/playlist?url=<encoded_playlist_url_or_id>
```

#### Query Parameters

- `url` (string, required): A public QQ Music playlist URL (e.g. `https://y.qq.com/n/ryqq/playlist/9044196528`, `https://i.y.qq.com/n2/m/share/details/taoge.html?id=9044196528`) or raw numeric playlist ID. Maximum 2048 characters.

---

## 6. Examples

### 6.1 Valid Request & Success Response

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
    "name": "中文民谣、流行",
    "creator": "琴心月满",
    "coverUrl": "http://p.qpic.cn/music_cover/...",
    "trackCount": 636,
    "tracks": [
      {
        "index": 1,
        "id": "003mN2sZ2...",
        "title": "何物",
        "artists": [
          "Lancelot_兰斯洛"
        ],
        "album": "何物",
        "durationMs": 210000,
        "sourceUrl": "https://y.qq.com/n/ryqq/songDetail/003mN2sZ2..."
      }
    ]
  }
}
```

---

### 6.2 Missing / Invalid Input (`400 Bad Request`)

**Request:**

```http
GET /api/playlist HTTP/1.1
Host: api.playlistout.com
```

**Response (`400 Bad Request`):**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Missing or empty required query parameter: url"
  }
}
```

---

### 6.3 Unsupported URL (`400 Bad Request`)

**Request:**

```http
GET /api/playlist?url=https%3A%2F%2Fmusic.163.com%2Fplaylist%3Fid%3D123 HTTP/1.1
Host: api.playlistout.com
```

**Response (`400 Bad Request`):**

```json
{
  "success": false,
  "error": {
    "code": "UNSUPPORTED_URL",
    "message": "The provided URL is not a supported QQ Music playlist URL. Expected: https://y.qq.com/n/ryqq/playlist/<id>"
  }
}
```

---

### 6.4 Playlist Not Found / Private (`404 Not Found`)

**Request:**

```http
GET /api/playlist?url=https%3A%2F%2Fy.qq.com%2Fn%2Fryqq%2Fplaylist%2F9999999999 HTTP/1.1
Host: api.playlistout.com
```

**Response (`404 Not Found`):**

```json
{
  "success": false,
  "error": {
    "code": "PLAYLIST_NOT_FOUND",
    "message": "QQ Music playlist 9999999999 does not exist or is private."
  }
}
```

---

### 6.5 Incomplete Playlist (`502 Bad Gateway`)

**Response (`502 Bad Gateway`):**

```json
{
  "success": false,
  "error": {
    "code": "INCOMPLETE_PLAYLIST",
    "message": "Incomplete playlist: QQ Music reported 1200 songs, but only 1000 could be retrieved.",
    "details": {
      "expectedCount": 1200,
      "actualCount": 1000
    }
  }
}
```

---

### 6.6 Upstream Timeout (`504 Gateway Timeout`)

**Response (`504 Gateway Timeout`):**

```json
{
  "success": false,
  "error": {
    "code": "UPSTREAM_TIMEOUT",
    "message": "Request to QQ Music timed out after 15000ms."
  }
}
```

---

### 6.7 Arbitrary Proxy Prohibited (`403 Forbidden`)

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

### 6.8 Method Not Allowed (`405 Method Not Allowed`)

**Request:**

```http
POST /api/playlist HTTP/1.1
Host: api.playlistout.com
```

**Response (`405 Method Not Allowed`):**

```json
{
  "success": false,
  "error": {
    "code": "METHOD_NOT_ALLOWED",
    "message": "HTTP method POST is not allowed on this endpoint. Use GET."
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

For requests from origins not in this list:
- Normal requests do not receive `Access-Control-Allow-Origin` response headers, causing the browser to block cross-origin access.
- Preflight `OPTIONS` requests receive `403 Forbidden`.
