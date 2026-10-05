#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PlaylistOut Dashboard V3 local server.

Security model:
- Binds to 127.0.0.1 only.
- INSIGHTS_ADMIN_TOKEN remains inside this Python process.
- Browser receives only an ephemeral local dashboard session nonce.
- All remote maintainer API calls are proxied server-to-server.
"""

from __future__ import annotations

import argparse
import json
import secrets
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from dashboard import get_admin_token

REMOTE_BASE = "https://playlistout-api.lengxiqwq.com"
DEFAULT_PORT = 8765
HOST = "127.0.0.1"


def _read_remote_json(
    path: str,
    token: str,
    *,
    method: str = "GET",
    body: bytes | None = None,
    timeout: int = 20,
) -> tuple[int, bytes]:
    url = REMOTE_BASE + path
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
        "User-Agent": "PlaylistOut-Dashboard-V3/1.0",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


class DashboardHandler(BaseHTTPRequestHandler):
    server_version = "PlaylistOutDashboard/3.0"

    @property
    def app(self) -> "DashboardHTTPServer":
        return self.server  # type: ignore[return-value]

    def log_message(self, fmt: str, *args) -> None:
        sys.stdout.write("[Dashboard] " + (fmt % args) + "\n")

    def _send_bytes(
        self,
        status: int,
        data: bytes,
        content_type: str,
        *,
        cache: str = "no-store",
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", cache)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline'; "
            "connect-src 'self'; img-src 'self' data:; "
            "font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
        )
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, status: int, obj: object) -> None:
        self._send_bytes(
            status,
            json.dumps(obj, ensure_ascii=False).encode("utf-8"),
            "application/json; charset=utf-8",
        )

    def _authorized_local_api(self) -> bool:
        provided = self.headers.get("X-Dashboard-Session", "")
        return secrets.compare_digest(provided, self.app.session_nonce)

    def _proxy(self, remote_path: str, *, method: str = "GET") -> None:
        if not self._authorized_local_api():
            self._send_json(
                403,
                {
                    "success": False,
                    "error": {
                        "code": "LOCAL_SESSION_REQUIRED",
                        "message": "Invalid local dashboard session.",
                    },
                },
            )
            return

        status, payload = _read_remote_json(
            remote_path,
            self.app.admin_token,
            method=method,
        )
        self._send_bytes(status, payload, "application/json; charset=utf-8")

    def do_OPTIONS(self) -> None:
        # Deliberately no CORS. The dashboard is same-origin localhost only.
        self.send_response(204)
        self.send_header("Allow", "GET, PUT, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlsplit(self.path)
        path = parsed.path
        query = parsed.query

        if path == "/":
            html = self.app.html_template.replace(
                "__DASHBOARD_SESSION_NONCE__",
                self.app.session_nonce,
            )
            self._send_bytes(
                200,
                html.encode("utf-8"),
                "text/html; charset=utf-8",
            )
            return

        if path == "/favicon.ico":
            self._send_bytes(204, b"", "image/x-icon")
            return

        suffix = ("?" + query) if query else ""

        if path == "/api/analytics":
            self._proxy("/api/internal/analytics/v2" + suffix)
            return

        if path == "/api/filters":
            params = urllib.parse.parse_qsl(query, keep_blank_values=False)
            params = [(k, v) for k, v in params if k != "mode"]
            params.append(("mode", "filters"))
            self._proxy(
                "/api/internal/analytics/v2?"
                + urllib.parse.urlencode(params)
            )
            return

        if path == "/api/feedback":
            self._proxy("/api/internal/feedback" + suffix)
            return

        if path == "/api/quarantine":
            self._proxy("/api/internal/quarantine" + suffix)
            return

        self._send_json(
            404,
            {
                "success": False,
                "error": {"code": "NOT_FOUND", "message": "Not found."},
            },
        )

    def do_PUT(self) -> None:
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path != "/api/feedback":
            self._send_json(
                404,
                {
                    "success": False,
                    "error": {"code": "NOT_FOUND", "message": "Not found."},
                },
            )
            return
        suffix = ("?" + parsed.query) if parsed.query else ""
        self._proxy("/api/internal/feedback" + suffix, method="PUT")


class DashboardHTTPServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(
        self,
        address: tuple[str, int],
        handler,
        *,
        admin_token: str,
        session_nonce: str,
        html_template: str,
    ) -> None:
        super().__init__(address, handler)
        self.admin_token = admin_token
        self.session_nonce = session_nonce
        self.html_template = html_template


def find_server(
    start_port: int,
    *,
    admin_token: str,
    session_nonce: str,
    html_template: str,
) -> DashboardHTTPServer:
    last_error: OSError | None = None
    for port in range(start_port, start_port + 10):
        try:
            return DashboardHTTPServer(
                (HOST, port),
                DashboardHandler,
                admin_token=admin_token,
                session_nonce=session_nonce,
                html_template=html_template,
            )
        except OSError as exc:
            last_error = exc
    raise RuntimeError(
        f"Unable to bind localhost dashboard ports {start_port}-{start_port + 9}: {last_error}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="PlaylistOut Analytics V2 local dashboard server"
    )
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent.parent
    html_path = script_dir / "dashboard_v3.html"

    if not html_path.exists():
        print(f"[Dashboard] [ERROR] Missing UI template: {html_path}")
        raise SystemExit(1)

    token = get_admin_token(repo_root)
    if not token:
        print("[Dashboard] [ERROR] INSIGHTS_ADMIN_TOKEN is missing.")
        print("            Set it in the environment or repository .dev.vars.")
        raise SystemExit(1)

    html_template = html_path.read_text(encoding="utf-8")
    session_nonce = secrets.token_urlsafe(32)
    server = find_server(
        args.port,
        admin_token=token,
        session_nonce=session_nonce,
        html_template=html_template,
    )
    port = server.server_address[1]
    url = f"http://{HOST}:{port}/"

    print("=" * 66)
    print("  PlaylistOut Analytics Dashboard V3")
    print("=" * 66)
    print(f"[Dashboard] Local URL : {url}")
    print("[Dashboard] Binding   : 127.0.0.1 only")
    print("[Dashboard] Admin token stays inside this Python process.")
    print("[Dashboard] Press Ctrl+C to stop.")
    print()

    if not args.no_open:
        threading.Timer(0.35, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print("\n[Dashboard] Shutting down...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
