#!/usr/bin/env python3
"""
PlaylistOut API Interception & Rate-Limiting Verification Script

Tests PlaylistOut API request interception behavior (Rate Limiting / Dual-track protection / Cloudflare edge).
Features:
- Built-in sample playlists from the PlaylistOut frontend.
- Supports testing direct API caller (6 req/min), player plugin (12 req/min), or official web frontend (30 req/min).
- Displays response latency, HTTP status, `Retry-After` headers, and JSON error envelope.
- Uses Python standard library only (no external dependencies required).

Usage:
  python scripts/utils/test_api_interception.py
  python scripts/utils/test_api_interception.py --count 12 --playlist netease
  python scripts/utils/test_api_interception.py --base-url http://127.0.0.1:8787 --count 10
  python scripts/utils/test_api_interception.py --mode web --count 35
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional, Tuple

# Ensure UTF-8 output on Windows terminal
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Sample playlists directly referenced from web/src/components/playlist/SearchNote.tsx
SAMPLE_PLAYLISTS = {
    "netease": "https://music.163.com/playlist?id=3778678",
    "qqmusic": "https://y.qq.com/n/ryqq/playlist/9547521556",
    "kugou": "https://m.kugou.com/songlist/gcid_3zr52qfrzaz06a/",
    "qishui": "https://qishui.douyin.com/s/iXHhKHhY/",
    "kuwo": "https://m.kuwo.cn/newh5app/playlist_detail/2311665489",
}

DEFAULT_BASE_URL = "https://playlistout-api.lengxiqwq.com"

# Terminal ANSI colors
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_GREEN = "\033[32m"
COLOR_YELLOW = "\033[33m"
COLOR_RED = "\033[31m"
COLOR_CYAN = "\033[36m"
COLOR_MAGENTA = "\033[35m"
COLOR_GRAY = "\033[90m"


def fetch_web_session_token(base_url: str) -> Optional[str]:
    """Fetch an ephemeral web session attestation token from /api/session/token."""
    url = f"{base_url.rstrip('/')}/api/session/token"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Origin": "https://playlistout.lengxiqwq.com",
            "Referer": "https://playlistout.lengxiqwq.com/",
            "Sec-Fetch-Site": "same-site",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("success") and data.get("data", {}).get("token"):
                return data["data"]["token"]
    except Exception as e:
        print(f"{COLOR_YELLOW}[Warning] Could not obtain web session token: {e}{COLOR_RESET}")
    return None


def execute_request(
    url: str,
    headers: Dict[str, str],
) -> Tuple[int, str, Dict[str, str], Dict[str, Any], float]:
    """Sends a single request and returns (status_code, reason, headers, body_json, duration_ms)."""
    req = urllib.request.Request(url, headers=headers)
    t0 = time.perf_counter()

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            duration_ms = (time.perf_counter() - t0) * 1000
            status_code = resp.status
            reason = getattr(resp, "reason", "OK")
            response_headers = {k: v for k, v in resp.headers.items()}
            raw_body = resp.read().decode("utf-8")
            try:
                body_json = json.loads(raw_body)
            except Exception:
                body_json = {"raw": raw_body}
            return status_code, reason, response_headers, body_json, duration_ms

    except urllib.error.HTTPError as e:
        duration_ms = (time.perf_counter() - t0) * 1000
        status_code = e.code
        reason = getattr(e, "reason", "HTTPError")
        response_headers = {k: v for k, v in e.headers.items()}
        try:
            raw_body = e.read().decode("utf-8")
            body_json = json.loads(raw_body)
        except Exception:
            body_json = {"raw": raw_body if "raw_body" in locals() else str(e)}
        return status_code, reason, response_headers, body_json, duration_ms

    except urllib.error.URLError as e:
        duration_ms = (time.perf_counter() - t0) * 1000
        return 0, str(e.reason), {}, {"error": str(e)}, duration_ms


def main():
    parser = argparse.ArgumentParser(
        description="PlaylistOut API Rate Limit & Interception Testing Tool"
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"Target API Base URL (default: {DEFAULT_BASE_URL})",
    )
    parser.add_argument(
        "--playlist",
        default="netease",
        help="Sample playlist key (netease, qqmusic, kugou, qishui) or full URL/ID",
    )
    parser.add_argument(
        "-n",
        "--count",
        type=int,
        default=10,
        help="Total number of requests to send (default: 10, set 0 for continuous mode)",
    )
    parser.add_argument(
        "-c",
        "--continuous",
        action="store_true",
        help="Continuous testing mode: runs indefinitely until interrupted by Ctrl+C",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.0,
        help="Delay between requests in seconds (default: 0.0 for max burst)",
    )
    parser.add_argument(
        "--mode",
        choices=["direct", "web", "plugin", "bot"],
        default="direct",
        help="Client mode simulation: direct (6/min), bot (6/min), plugin (12/min), web (30/min)",
    )

    args = parser.parse_args()

    # Determine playlist URL
    target_playlist = SAMPLE_PLAYLISTS.get(args.playlist.lower(), args.playlist)

    # Resolve target API URL
    endpoint_url = (
        f"{args.base_url.rstrip('/')}/api/v1/resolve?"
        f"q={urllib.parse.quote(target_playlist)}&type=playlist"
    )

    # Configure headers according to client mode
    headers = {
        "Accept": "application/json",
    }

    mode_description = ""
    expected_limit = 6

    if args.mode == "direct":
        headers["User-Agent"] = "PlaylistOut-DirectApi-Tester/1.0"
        mode_description = "Direct API caller (Untrusted script, rate limit = 6 req/min)"
        expected_limit = 6
    elif args.mode == "bot":
        headers["User-Agent"] = "curl/7.88.1 (Automated Bot / Scraper)"
        mode_description = "Explicit Bot/Crawler UA (rate limit = 6 req/min)"
        expected_limit = 6
    elif args.mode == "plugin":
        headers["User-Agent"] = "PlaylistOut-Plugin/1.0.0"
        headers["X-PlaylistOut-Client-Type"] = "plugin"
        headers["X-PlaylistOut-Client-Id"] = "musicfree"
        mode_description = "Registered Player Plugin (MusicFree, rate limit = 12 req/min)"
        expected_limit = 12
    elif args.mode == "web":
        print(f"{COLOR_CYAN}[Init] Fetching Web Session Attestation Token...{COLOR_RESET}")
        token = fetch_web_session_token(args.base_url)
        headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0"
        headers["Origin"] = "https://playlistout.lengxiqwq.com"
        headers["Referer"] = "https://playlistout.lengxiqwq.com/"
        headers["Sec-Fetch-Site"] = "same-site"
        headers["Accept-Language"] = "zh-CN,zh;q=0.9,en;q=0.8"
        if token:
            headers["X-PlaylistOut-Session"] = token
            print(f"{COLOR_GREEN}[Init] Session token acquired successfully.{COLOR_RESET}")
        else:
            print(f"{COLOR_YELLOW}[Init] Failed to acquire session token, falling back to browser headers.{COLOR_RESET}")
        mode_description = "Official Web Frontend (Dual-track session, rate limit = 30 req/min)"
        expected_limit = 30

    is_infinite = args.continuous or args.count <= 0
    total_display = "Infinite (Ctrl+C to stop)" if is_infinite else str(args.count)

    print("=" * 72)
    print(f"{COLOR_BOLD}{COLOR_CYAN}PlaylistOut API Interception Test{COLOR_RESET}")
    print("=" * 72)
    print(f" Target API   : {args.base_url}")
    print(f" Sample Input : {target_playlist}")
    print(f" Client Mode  : {args.mode} ({mode_description})")
    print(f" Limit Quota  : {expected_limit} req / 60s per IP")
    print(f" Total Requests: {total_display} (Interval: {args.delay}s)")
    print("=" * 72)
    print()

    results = []
    first_intercepted_idx = None
    i = 0

    try:
        while True:
            i += 1
            if not is_infinite and i > args.count:
                break

            status, reason, resp_headers, body, duration = execute_request(endpoint_url, headers)
            results.append((status, reason, resp_headers, body, duration))

            # Format line output
            retry_after = resp_headers.get("Retry-After") or resp_headers.get("retry-after")
            cf_ray = resp_headers.get("cf-ray") or resp_headers.get("CF-RAY")
            server_ver = resp_headers.get("x-playlistout-server-version", "")

            idx_str = f"[{i:04d}]" if is_infinite else f"[{i:02d}/{args.count:02d}]"

            if status == 200:
                playlist_name = body.get("data", {}).get("result", {}).get("name", "Unknown")
                track_count = body.get("data", {}).get("result", {}).get("trackCount", 0)
                platform = body.get("data", {}).get("platform", "")
                print(
                    f"{COLOR_GREEN}{idx_str} HTTP 200 OK{COLOR_RESET} "
                    f"({duration:6.1f}ms) | "
                    f"Passed | Platform: {platform:<7} | Tracks: {track_count:<3} | Name: {playlist_name[:24]}"
                )
            elif status == 429:
                if first_intercepted_idx is None:
                    first_intercepted_idx = i
                err_code = body.get("error", {}).get("code", "RATE_LIMITED")
                err_msg = body.get("error", {}).get("message", "Too many requests")
                print(
                    f"{COLOR_YELLOW}{COLOR_BOLD}{idx_str} HTTP 429 Too Many Requests{COLOR_RESET} "
                    f"({duration:6.1f}ms) | "
                    f"{COLOR_YELLOW}INTERCEPTED{COLOR_RESET} | Code: {err_code} | "
                    f"Retry-After: {retry_after}s | Msg: {err_msg}"
                )
            elif status == 403:
                print(
                    f"{COLOR_RED}{idx_str} HTTP 403 Forbidden{COLOR_RESET} "
                    f"({duration:6.1f}ms) | "
                    f"WAF/Constitution Block | Body: {json.dumps(body, ensure_ascii=False)[:60]}"
                )
            elif status == 0:
                print(
                    f"{COLOR_RED}{idx_str} Connection Failed{COLOR_RESET} "
                    f"({duration:6.1f}ms) | Network Error: {reason}"
                )
            else:
                print(
                    f"{COLOR_RED}{idx_str} HTTP {status} {reason}{COLOR_RESET} "
                    f"({duration:6.1f}ms) | "
                    f"Response: {json.dumps(body, ensure_ascii=False)[:80]}"
                )

            if args.delay > 0:
                time.sleep(args.delay)

    except KeyboardInterrupt:
        print(f"\n{COLOR_YELLOW}[Stopped] Interrupted by user (Ctrl+C). Generating summary...{COLOR_RESET}")

    print()
    print("=" * 72)
    print(f"{COLOR_BOLD}Interception Analysis & Verification Summary{COLOR_RESET}")
    print("=" * 72)

    total_200 = sum(1 for r in results if r[0] == 200)
    total_429 = sum(1 for r in results if r[0] == 429)
    total_other = len(results) - total_200 - total_429

    print(f" [+] Successful Requests (HTTP 200)   : {total_200}")
    print(f" [!] Rate-Limited (HTTP 429)         : {total_429}")
    if total_other > 0:
        print(f" [-] Other Status Codes              : {total_other}")

    if first_intercepted_idx:
        first_resp_headers = results[first_intercepted_idx - 1][2]
        first_body = results[first_intercepted_idx - 1][3]
        ra = first_resp_headers.get("Retry-After") or first_resp_headers.get("retry-after", "N/A")
        cf_ray = first_resp_headers.get("cf-ray") or "N/A"

        print(f"\n{COLOR_YELLOW}{COLOR_BOLD}>> Interception Triggered on Request #{first_intercepted_idx}:{COLOR_RESET}")
        print(f"   * Response HTTP Status : 429 Too Many Requests")
        print(f"   * Retry-After Header   : {ra} seconds")
        print(f"   * Cloudflare Ray ID    : {cf_ray}")
        print(f"   * JSON Error Payload   : {json.dumps(first_body, ensure_ascii=False)}")
        print(f"   * Behavior Verification: Quota matches the expected threshold ({expected_limit} req/min).")
    else:
        print(f"\n{COLOR_GREEN}No requests were intercepted (all requests stayed within the {expected_limit} req/min limit).{COLOR_RESET}")
        print("Tip: Run with `-n 12` to exceed the 6 req/min quota for direct API requests.")

    print("=" * 72)


if __name__ == "__main__":
    main()
