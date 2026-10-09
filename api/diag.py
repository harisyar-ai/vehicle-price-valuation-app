"""Temporary diagnostic: minimal GET function to isolate the search.py 500."""
from http.server import BaseHTTPRequestHandler
import json
import sys


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({"ok": True, "python": sys.version.split()[0]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
