"""Vercel Python serverless function: GET /api/search -> live PakWheels listings.

Ports fetch_similar_listing_page + parse_listing_card from the Streamlit app's
"Search Cars" page. Single page only (page=1) with an 8s upstream timeout so the
function stays comfortably inside Vercel's 10s Hobby limit.

Query params:
  brand (required), model (required), generation, trim, city, year

Success:  200 {"listings": [{"Title","City","Year","Price","Listing_URL","Cover_URL"}, ...]}
Failure:  503 {"error": "<friendly message>"} — the UI renders this as a
          "live listings unavailable" state. Never a 500 crash.
"""
import json
import os
import re
import sys

# Ensure sibling modules resolve both locally and on Vercel.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote_plus

import requests
from bs4 import BeautifulSoup

TIMEOUT = 8  # seconds — must stay under Vercel's 10s Hobby function limit
MAX_RESULTS = 12

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

UNAVAILABLE_MSG = (
    "Live listings are temporarily unavailable — PakWheels did not respond. "
    "Please try again in a bit."
)

_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def generation_matches_title(generation, title):
    if not generation or generation == "Unspecified":
        return False
    primary = str(generation).split("/")[0].strip().lower()
    return bool(primary and primary in str(title).lower())


def parse_listing_card(car, brand, model_name):
    """Extract one listing row from a PakWheels search-result card element."""
    listing_url = ""
    cover_url = ""

    script = car.find("script", type="application/ld+json")
    if script and script.string:
        try:
            ld = json.loads(script.string)
            listing_url = ld.get("offers", {}).get("url", "") or ""
            cover_url = ld.get("image", "") or ""
        except Exception:
            pass

    if not listing_url:
        a_tag = car.find("a", href=True)
        if a_tag:
            href = a_tag["href"]
            listing_url = href if href.startswith("http") else f"https://www.pakwheels.com{href}"

    if not cover_url:
        img = car.find("img")
        if img:
            cover_url = img.get("data-original") or img.get("data-src") or img.get("src") or ""

    h3 = car.find("h3")
    title = h3.get_text(" ", strip=True) if h3 else f"{brand} {model_name}"

    price_div = car.find("div", class_=lambda x: x and "price-details" in x)
    price = price_div.get_text(" ", strip=True) if price_div else ""

    city = ""
    city_ul = car.find("ul", class_="search-vehicle-info")
    if city_ul:
        city_li = city_ul.find("li")
        if city_li:
            city = city_li.get_text(" ", strip=True)

    year_val = ""
    specs_ul = car.find("ul", class_="search-vehicle-info-2")
    if specs_ul:
        items = [li.get_text(" ", strip=True) for li in specs_ul.find_all("li")]
        if items:
            year_val = items[0]

    return {
        "brand": brand,
        "model": model_name,
        "Title": title,
        "City": city,
        "Year": year_val,
        "Price": price,
        "Listing_URL": listing_url,
        "Cover_URL": cover_url,
    }


def fetch_search_page(brand, model_name, trim, year, city):
    """Fetch one PakWheels results page and return filtered listing rows."""
    query_bits = [brand, model_name]
    if trim and trim != "Unspecified":
        query_bits.append(trim)
    if year:
        query_bits.append(str(year))
    if city and city != "Other":
        query_bits.append(city)
    query = quote_plus(" ".join(query_bits))

    url = f"https://www.pakwheels.com/used-cars/search/-/?q={query}&page=1"
    response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    cards = soup.find_all("li", class_=lambda x: x and "classified-listing" in x)

    rows = []
    seen = set()
    for card in cards:
        row = parse_listing_card(card, brand, model_name)
        title_lower = row["Title"].lower()
        # Same brand/model guard as the Streamlit app
        if brand.lower() not in title_lower:
            continue
        if model_name.split()[0].lower() not in title_lower:
            continue
        # Year filter (same as scrape_search_listings)
        if year:
            m = re.search(r"(\d{4})", str(row["Year"]))
            if not m or int(m.group(1)) != int(year):
                continue
        # City filter (same as scrape_search_listings)
        if city and city != "Other" and str(row["City"]).strip().lower() != city.lower():
            continue
        key = row["Listing_URL"] or (row["Title"], row["Price"])
        if key in seen:
            continue
        seen.add(key)
        rows.append(row)
        if len(rows) >= MAX_RESULTS:
            break

    return rows


class handler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        for k, v in _CORS.items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(body))
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
            get = lambda k: (qs.get(k, [""])[0] or "").strip()
            brand = get("brand")
            model_name = get("model")
            generation = get("generation")
            trim = get("trim")
            city = get("city")
            year = get("year")
        except Exception:
            self._send(400, {"error": "Could not read the search parameters."})
            return

        if not brand or not model_name:
            self._send(400, {"error": "Choose a brand and model to search live listings."})
            return

        try:
            rows = fetch_search_page(brand, model_name, trim, year or "", city)
            # Attach generation for ranking without leaking it into the payload shape
            for r in rows:
                r["_generation"] = generation
            rows.sort(key=lambda r: (
                0 if generation_matches_title(r.pop("_generation", ""), r["Title"]) else 1,
                0 if city and str(r["City"]).strip().lower() == city.lower() else 1,
            ))
            self._send(200, {"listings": rows})
        except Exception:
            # Graceful degradation: PakWheels blocked us, timed out, or changed
            # markup — the UI shows a friendly "unavailable" state, never a crash.
            self._send(503, {"error": UNAVAILABLE_MSG})
