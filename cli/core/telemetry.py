# -*- coding: utf-8 -*-
"""
Playlist Out CLI Telemetry & Insights Integration
=================================================
Fire-and-forget, non-blocking telemetry reporter communicating with the official
Playlist Out Insights endpoint (POST /api/event) to record aggregate product usage.

Governed strictly by docs/PROJECT-CONSTITUTION.md:
- No user-identifying data, track lists, URLs, or tokens are ever collected or stored.
- Fully non-blocking via background daemon threads with a strict 2-second timeout.
- Fully silent fail-open: network failures and server errors are completely swallowed.
- Respects opt-out via --no-telemetry, DO_NOT_TRACK=1, and PLAYLISTOUT_NO_TELEMETRY=1.
- Self-test and pytest suites are strictly isolated with zero network communication.
- Efficient batching: queues events in memory and sends them in a single batch payload,
  ensuring batch export of N playlists triggers exactly 1 HTTP request with zero data loss.
"""

import os
import sys
import json
import atexit
import threading
from typing import Optional, List

from .version import get_version

_TELEMETRY_ENABLED_OVERRIDE: Optional[bool] = None
DEFAULT_API_BASE_URL = "https://playlistout-api.lengxiqwq.com"

_EVENT_QUEUE: List[dict] = []
_QUEUE_LOCK = threading.Lock()
_ACTIVE_THREADS: List[threading.Thread] = []
_THREAD_LOCK = threading.Lock()


def clear_event_queue() -> None:
    """Clear in-memory event buffer (testing utility)."""
    with _QUEUE_LOCK:
        _EVENT_QUEUE.clear()


def set_telemetry_enabled(enabled: Optional[bool]) -> None:
    """Override telemetry state programmatically (primarily for self-test and testing)."""
    global _TELEMETRY_ENABLED_OVERRIDE
    _TELEMETRY_ENABLED_OVERRIDE = enabled


def get_platform_system() -> str:
    """Map system platform to standard host categories for Insights attribution."""
    p = sys.platform.lower()
    if p.startswith("win"):
        return "windows"
    if p.startswith("darwin"):
        return "macos"
    if p.startswith("linux"):
        return "linux"
    return "other"


def is_telemetry_enabled() -> bool:
    """Check whether anonymous aggregate telemetry reporting is enabled."""
    if _TELEMETRY_ENABLED_OVERRIDE is not None:
        return _TELEMETRY_ENABLED_OVERRIDE

    # 1. Automated test and self-test isolation
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return False
    if "--self-test" in sys.argv:
        return False

    # 2. Command-line flag opt-out
    if "--no-telemetry" in sys.argv:
        return False

    # 3. Standard privacy environment variables (e.g. DO_NOT_TRACK or custom flag)
    if os.environ.get("DO_NOT_TRACK") == "1" or os.environ.get("PLAYLISTOUT_NO_TELEMETRY") == "1":
        return False

    return True


def get_telemetry_url() -> str:
    base = os.environ.get("PLAYLISTOUT_API_BASE_URL", DEFAULT_API_BASE_URL).rstrip("/")
    return f"{base}/api/event"


def _dispatch_event_payload(payload: dict) -> None:
    """Send JSON payload to /api/event synchronously inside a worker thread."""
    try:
        import requests

        url = get_telemetry_url()
        version = get_version()
        host = get_platform_system()

        headers = {
            "Content-Type": "application/json",
            "X-PlaylistOut-Client-Type": "cli",
            "X-PlaylistOut-Client-Id": "official_cli",
            "X-PlaylistOut-Client-Version": version,
            "X-PlaylistOut-Host": host,
            "X-PlaylistOut-Device-Class": "desktop",
        }

        # Strict 2-second timeout, completely silent on any failure
        requests.post(
            url,
            headers=headers,
            data=json.dumps(payload),
            timeout=2.0,
            allow_redirects=False,
        )
    except Exception:
        # Non-blocking best-effort: silently swallow all exceptions (DNS, timeout, TLS, connection refused)
        pass


def queue_event(payload: dict) -> None:
    """Queue an event into the thread-safe memory buffer without network I/O."""
    if not is_telemetry_enabled():
        return
    with _QUEUE_LOCK:
        _EVENT_QUEUE.append(payload)


def flush_telemetry(wait: bool = False) -> None:
    """
    Pack all queued events in memory and dispatch them in a single batch HTTP request.
    If multiple events exist, wraps them in a single { "type": "batch", "events": [...] } payload.
    If wait=True, waits for the worker thread to finish (e.g. at exit).
    """
    if not is_telemetry_enabled():
        return

    with _QUEUE_LOCK:
        if not _EVENT_QUEUE:
            return
        events_to_send = list(_EVENT_QUEUE)
        _EVENT_QUEUE.clear()

    CHUNK_SIZE = 100
    chunks = [
        events_to_send[i : i + CHUNK_SIZE]
        for i in range(0, len(events_to_send), CHUNK_SIZE)
    ]
    payloads = []
    for chunk in chunks:
        if len(chunk) == 1:
            payloads.append(chunk[0])
        else:
            payloads.append({
                "type": "batch",
                "events": chunk,
            })

    def _run_worker(payload_list: list) -> None:
        try:
            for p in payload_list:
                _dispatch_event_payload(p)
        finally:
            with _THREAD_LOCK:
                curr = threading.current_thread()
                if curr in _ACTIVE_THREADS:
                    _ACTIVE_THREADS.remove(curr)

    try:
        t = threading.Thread(target=_run_worker, args=(payloads,), daemon=True)
        with _THREAD_LOCK:
            _ACTIVE_THREADS.append(t)
        t.start()
        if wait:
            t.join(timeout=2.0)
    except Exception:
        pass


def post_event_async(payload: dict) -> None:
    """Queue single event and immediately flush in background."""
    queue_event(payload)
    flush_telemetry(wait=False)


def report_export(
    platform: str,
    format: str,
    track_count: Optional[int] = None,
    auto_flush: bool = True,
) -> None:
    """
    Report a successful export action.
    Format must be one of: xlsx, csv, json, txt, m3u8.
    """
    if not platform or not format:
        return

    payload = {
        "type": "export",
        "platform": platform.lower().strip(),
        "format": format.lower().strip(),
    }
    if track_count is not None and isinstance(track_count, int) and track_count >= 0:
        payload["trackCount"] = min(track_count, 50000)

    queue_event(payload)
    if auto_flush:
        flush_telemetry(wait=False)


def report_export_formats(
    platform: str,
    formats: List[str],
    track_count: Optional[int] = None,
    auto_flush: bool = True,
) -> None:
    """
    Report multiple exported formats from a single playlist export session.
    All formats are queued into memory and flushed together in 1 single HTTP request.
    """
    if not formats:
        return
    for fmt in formats:
        report_export(platform, fmt, track_count, auto_flush=False)
    if auto_flush:
        flush_telemetry(wait=False)


def report_resolve(
    platform: str,
    outcome: str,
    track_count: Optional[int] = None,
    latency_ms: Optional[int] = None,
    failure_code: Optional[str] = None,
    auto_flush: bool = False,
) -> None:
    """
    Report a playlist/user resolve outcome to track platform health.
    - outcome: 'success_playlist', 'success_user', or 'failure'
    - failure_code: optional category (e.g. 'upstream_error', 'timeout', 'not_found', 'parse_error')
    - auto_flush: default False so resolve and export are bundled together when exporting starts.
    """
    if not platform or not outcome:
        return

    payload = {
        "type": "resolve",
        "platform": platform.lower().strip(),
        "outcome": outcome,
    }
    if track_count is not None and isinstance(track_count, int) and track_count >= 0:
        payload["trackCount"] = min(track_count, 50000)
    if latency_ms is not None and isinstance(latency_ms, (int, float)) and latency_ms >= 0:
        payload["latencyMs"] = int(round(latency_ms))
    if failure_code and isinstance(failure_code, str):
        payload["failureCode"] = failure_code[:64].lower()

    queue_event(payload)
    if auto_flush:
        flush_telemetry(wait=False)


def _cleanup_at_exit() -> None:
    try:
        flush_telemetry(wait=True)
        with _THREAD_LOCK:
            threads = list(_ACTIVE_THREADS)
        for t in threads:
            try:
                t.join(timeout=1.0)
            except Exception:
                pass
    except Exception:
        pass


# Automatically flush any pending buffered events when python process exits
try:
    atexit.register(_cleanup_at_exit)
except Exception:
    pass
