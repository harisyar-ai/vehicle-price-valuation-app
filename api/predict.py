"""Vercel Python serverless function: POST /api/predict -> vehicle price estimate.

Request JSON:
{
  "brand": "Toyota", "model": "Corolla", "generation": "11th Generation",
  "trim": "GLi", "engine_cc": 1300, "fuel_type": "Petrol",
  "transmission": "Manual", "year": 2020, "mileage": 80000, "city": "Lahore"
}

Response JSON:
{
  "price_lacs": 33.2, "price_pkr": 3323120,
  "low_lacs": 32.0, "high_lacs": 34.5,
  "price_display": "PKR 33.2 Lacs", "urdu": "...",
  "confidence": "high", "confidence_label": "High Confidence"
}
"""
import json
import os
import sys

# Ensure sibling modules (e.g. _model.py) resolve both locally and on Vercel.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from http.server import BaseHTTPRequestHandler

from _model import (
    get_price_margin,
    get_confidence,
    format_urdu_price,
    predict_price_lacs,
)

REQUIRED = ["brand", "model", "generation", "trim", "engine_cc",
            "fuel_type", "transmission", "year", "mileage", "city"]

_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


class handler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
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

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
        except (TypeError, ValueError):
            length = 0
        if length <= 0 or length > 65536:
            self._send(400, {"error": "empty or oversized request body"})
            return
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            self._send(400, {"error": "invalid JSON body"})
            return

        missing = [f for f in REQUIRED if f not in data or data[f] in (None, "")]
        if missing:
            self._send(400, {"error": "missing fields", "fields": missing})
            return

        try:
            year = int(data["year"])
            mileage = float(data["mileage"])
            engine_cc = data["engine_cc"]
            if not (1990 <= year <= 2026):
                raise ValueError("year out of range")
            if not (0 <= mileage <= 1000000):
                raise ValueError("mileage out of range")
        except (ValueError, TypeError) as e:
            self._send(400, {"error": f"invalid numeric input: {e}"})
            return

        try:
            price = predict_price_lacs(
                brand=data["brand"], model_name=data["model"],
                generation=data["generation"], trim=data["trim"],
                engine_cc=engine_cc, fuel_type=data["fuel_type"],
                transmission=data["transmission"], year=year,
                mileage=mileage, city=data["city"],
            )
        except Exception as e:
            self._send(500, {"error": f"prediction failed: {e}"})
            return

        margin = get_price_margin(price)
        low, high = price * (1 - margin), price * (1 + margin)
        conf_key, conf_label, _ = get_confidence(data["brand"], price)

        self._send(200, {
            "price_lacs": round(price, 2),
            "price_pkr": int(round(price * 100000)),
            "low_lacs": round(low, 2),
            "high_lacs": round(high, 2),
            "price_display": f"PKR {price:.1f} Lacs",
            "range_display": f"PKR {low:.1f} — {high:.1f} Lacs",
            "urdu": format_urdu_price(price),
            "confidence": conf_key,
            "confidence_label": conf_label,
        })
