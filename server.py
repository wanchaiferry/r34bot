#!/usr/bin/env python3
"""Local development server with a built-in Rule34 API proxy.

This script serves the static files in the repository directory and exposes a
``/rule34-proxy`` endpoint that forwards queries to the official Rule34 API.
The proxy keeps requests on the same origin so browsers are not blocked by
CORS restrictions.
"""

from __future__ import annotations

import argparse
import http.server
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

RULE34_API_URL = os.environ.get("RULE34_API_URL", "https://api.rule34.xxx/index.php")
USER_AGENT = "r34bot-local-proxy/1.0"


class Rule34ProxyRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler that serves static files and proxies Rule34 API requests."""

    protocol_version = "HTTP/1.1"

    def do_GET(self) -> None:  # noqa: N802 (method name required by base class)
        if self.path.startswith("/rule34-proxy"):
            self.handle_rule34_proxy()
            return

        super().do_GET()

    def do_HEAD(self) -> None:  # noqa: N802 (method name required by base class)
        if self.path.startswith("/rule34-proxy"):
            self.send_error(405, "Method Not Allowed")
            self.send_header("Allow", "GET, OPTIONS")
            self.end_headers()
            return

        super().do_HEAD()

    def do_OPTIONS(self) -> None:  # noqa: N802 (method name required by base class)
        if self.path.startswith("/rule34-proxy"):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
            return

        super().do_OPTIONS()

    def handle_rule34_proxy(self) -> None:
        parsed = urllib.parse.urlsplit(self.path)
        query = parsed.query

        if not query:
            self.send_error(400, "Missing query string for Rule34 proxy.")
            return

        upstream_url = f"{RULE34_API_URL}?{query}"
        request = urllib.request.Request(
            upstream_url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json, text/plain, */*",
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=15) as upstream:
                status = upstream.getcode()
                body = upstream.read()
                content_type = upstream.headers.get("Content-Type", "application/json")
        except urllib.error.HTTPError as exc:  # pragma: no cover - passthrough behaviour
            status = exc.code
            body = exc.read()
            content_type = exc.headers.get("Content-Type", "application/json")
        except urllib.error.URLError as exc:
            message = f"Failed to reach Rule34 API: {exc.reason}"
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(message.encode("utf-8", "replace"))
            return

        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--bind",
        default=os.environ.get("BIND", "127.0.0.1"),
        help="Specify alternate bind address (default: 127.0.0.1).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", "8000")),
        help="Specify alternate port (default: 8000).",
    )
    return parser.parse_args(argv)


def run_server(bind: str, port: int) -> None:
    base_dir = Path(__file__).resolve().parent
    os.chdir(base_dir)

    server_address: tuple[str, int] = (bind, port)
    handler_class = Rule34ProxyRequestHandler

    with http.server.ThreadingHTTPServer(server_address, handler_class) as httpd:
        host_display = "localhost" if bind in {"127.0.0.1", "0.0.0.0"} else bind
        print(f"Serving {base_dir} at http://{host_display}:{port}")
        print("Proxy endpoint available at /rule34-proxy")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:  # pragma: no cover - manual shutdown path
            print("\nShutting down server.")


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv or sys.argv[1:])
    run_server(args.bind, args.port)


if __name__ == "__main__":
    main()
