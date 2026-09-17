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
   - **Sensitive & Auth Endpoints** (`/api/kugou/*`, `POST /api/event`):
     - Strictly restricted to official PlaylistOut domains and `localhost` development environments.
     - Unauthorized origins receive `403 Forbidden` on OPTIONS preflight.
2. **Zero-Trust Header-Only Authentication**:
   - Authentication tokens and credentials must **never** appear in URLs or query strings (`?token=...`, `?auth=...`, etc.). Any request containing credential query parameters is immediately rejected with `400 INVALID_INPUT`.
   - Third-party credentials (such as KuGou session tokens) are accepted exclusively via standard HTTP headers:
     - `Authorization: Bearer <token>`
     - `X-Kugou-Userid: <userid>`
   - The backend is 100% stateless: credentials are never stored in any server database or analytics record.
3. **No Arbitrary Proxying**:
   - Outbound requests are strictly allowlisted to official upstream music endpoints.
   - Any attempt to access `/proxy`, `/proxy/*`, or `/api/proxy` is rejected with `403 FORBIDDEN`.
4. **Rate Limiting**:
   - Standard IP-based sliding window:
     - `/api/v1/resolve`: **30 requests / minute** per client IP.
     - `/api/v1/playlist`: **30 requests / minute** per client IP.
     - `/api/v1/user/playlists`: **30 requests / minute** per client IP.
     - `/api/v1/stats`: **60 requests / minute** per client IP.
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

Returns coarse, privacy-preserving aggregate statistics (parses, tracks, exports, platform distribution).

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "totalPlaylistsParsed": 1250,
    "totalTracksProcessed": 105400,
    "totalExports": 860,
    "byPlatform": {
      "qqmusic": { "totalSuccess": 600 },
      "netease": { "totalSuccess": 450 },
      "kugou": { "totalSuccess": 120 },
      "qishui": { "totalSuccess": 80 }
    }
  }
}
```

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

- **In the Web UI**: Click "连接酷狗账号" to open a mobile QR code popup. Scan with the official KuGou App to store credentials in local storage (never uploaded to the server).
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

#### KuGou Playlist with Ephemeral Token Headers
```bash
curl -s "https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://www.kugou.com/songlist/gcid_3zr52qfrzaz06a/" \
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

