"""Vercel Python serverless function: GET /api/img?url=<encoded> -> image bytes.

Why this exists: PakWheels' image CDN (cache1..4.pakwheels.com) is blocked for
some user networks (Cloudflare flag on the user's IP), so hotlinked <img> tags
render as broken images for those users. Vercel's servers reach PakWheels fine,
so fetching the bytes server-side and re-serving them from our own domain fixes
it — the user's browser never touches the flagged CDN.

This is NOT an open proxy. Safety rules:
  * strict host allowlist — only cache1-4.pakwheels.com, https only
  * upstream Content-Type must start with image/ or we refuse
  * 5MB response cap, 8s timeout (inside Vercel Hobby's 10s limit)
  * 24h immutable Cache-Control so browsers and the edge cache aggressively

Query params:
  url (required) — the full https URL of the PakWheels CDN image

Success:  200 <image bytes> with the upstream Content-Type
Failure:  4xx/502 {"error": "<friendly message>"} — the UI's onError
          brand-tile fallback renders instead of a broken image. Never a 500.
"""
import os
import sys

# Ensure sibling modules resolve both locally and on Vercel.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# NOTE: requests is imported lazily inside the fetch (not at module level),
# matching api/search.py — if the runtime ever lacks it, the import error lands
# in the guarded 502 path below instead of killing the invocation (500).

TIMEOUT = 8  # seconds — must stay under Vercel's 10s Hobby limit
MAX_BYTES = 5 * 1024 * 1024  # 5MB — listing covers are ~50-300KB; this is generous
CACHE_CONTROL = "public, max-age=86400, immutable"  # 24h

# Only PakWheels' image CDN hosts. cache1..4 serve listing images;
# wsa1-4 are ads/trackers and are deliberately excluded.
ALLOWED_HOSTS = frozenset(f"cache{i}.pakwheels.com" for i in range(1, 5))

_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

_IMG_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "Referer": "https://www.pakwheels.com/",
}


def _validate_target(raw):
    """Return the URL if it passes the allowlist, else an error string."""
    if not raw:
        return None, "Missing 'url' parameter."
    try:
        parsed = urlparse(raw)
    except Exception:
        return None, "Could not parse the image URL."
    if parsed.scheme != "https":
        return None, "Only https image URLs are allowed."
    if (parsed.hostname or "").lower() not in ALLOWED_HOSTS:
        return None, "That image host is not allowed."
    return raw, None


def _fetch_image(target):
    """Fetch image bytes server-side. Returns (bytes, content_type) or raises."""
    import requests

    resp = requests.get(target, headers=_IMG_HEADERS, timeout=TIMEOUT, stream=True)
    resp.raise_for_status()

    content_type = resp.headers.get("Content-Type", "").split(";")[0].strip().lower()
    if not content_type.startswith("image/"):
        raise ValueError(f"Upstream did not return an image (got '{content_type or 'unknown'}').")

    # Refuse early on a lying-large Content-Length; chunked responses get the
    # hard cap check below after download.
    try:
        declared = int(resp.headers.get("Content-Length") or 0)
    except (TypeError, ValueError):
        declared = 0
    if declared > MAX_BYTES:
        raise ValueError("Image is too large.")

    body = resp.content
    if len(body) > MAX_BYTES:
        raise ValueError("Image is too large.")
    if not body:
        raise ValueError("Upstream returned an empty response.")
    return body, content_type


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        import json
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        for k, v in _CORS.items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_image(self, body, content_type):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", CACHE_CONTROL)
        for k, v in _CORS.items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in _CORS.items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        try:
            qs = parse_qs(urlparse(self.path).query)
            raw = (qs.get("url", [""])[0] or "").strip()
        except Exception:
            self._send_json(400, {"error": "Could not read the request."})
            return

        target, err = _validate_target(raw)
        if err:
            self._send_json(400, {"error": err})
            return

        try:
            body, content_type = _fetch_image(target)
        except Exception:
            # Graceful degradation: upstream blocked us, timed out, or sent
            # garbage — the UI falls back to the brand tile, never a crash.
            self._send_json(502, {"error": "Could not load that image right now."})
            return

        self._send_image(body, content_type)
