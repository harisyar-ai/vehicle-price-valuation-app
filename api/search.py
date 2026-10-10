"""Vercel Python serverless function: GET /api/search -> live PakWheels listings.

Ports fetch_similar_listing_page / scrape_search_listings + parse_listing_card +
rank_similar_listings from the Streamlit app.

Two modes:
  * default (Search page): strict brand/model/year/city match, single PakWheels
    page, sorted by generation/city match.
  * mode=similar (Predict page "Show similar listings"): broader brand/model/trim
    query across up to 3 PakWheels pages, then Streamlit-faithful ranking —
    price inside the predicted range + year match first, then closest price to
    the predicted price, then year/city/generation matches.

Query params:
  brand (required), model (required), generation, trim, city, year,
  mode ('similar' for ranked mode), predicted_price, low_price, high_price

Success:  200 {"listings": [{"Title","City","Year","Price","Listing_URL","Cover_URL"}, ...]}
Failure:  503 {"error": "<friendly message>"} — the UI renders this as a
          "live listings unavailable" state. Never a 500 crash.
"""
import json
import os
import re
import sys
import time

# Ensure sibling modules resolve both locally and on Vercel.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote_plus

# NOTE: requests/bs4 are imported lazily inside fetch (not at module level).
# If Vercel's build ever ships the function without them, the import error lands
# in the guarded 503 path below instead of killing the whole invocation (500).

TIMEOUT = 8  # seconds per upstream request — must stay under Vercel's 10s Hobby limit
FETCH_BUDGET = 7.5  # total seconds allowed for multi-page fetching in similar mode
SIMILAR_MAX_PAGES = 3
SIMILAR_MAX_RESULTS = 30
SEARCH_MAX_RESULTS = 12
CACHE_TTL = 600  # seconds — repeat queries are served without touching PakWheels
CACHE_MAX_ENTRIES = 50

# A small pool of current, real browser user-agents. One is picked at random per
# invocation so we don't present the same static fingerprint on every request.
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/116.0.0.0",
]


def make_headers():
    """A full, realistic browser header set — bare-bones headers are the
    single most common bot fingerprint."""
    import random
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
    }


# In-memory TTL cache (warm serverless instances reuse it). Keyed by query —
# a repeat "Show similar listings" click never touches PakWheels at all, which
# is both faster for the user and far less bot-like in volume.
_CACHE = {}


def _cache_get(key):
    import time as _t
    entry = _CACHE.get(key)
    if entry and _t.time() - entry[0] < CACHE_TTL:
        return entry[1]
    _CACHE.pop(key, None)
    return None


def _cache_set(key, value):
    import time as _t
    if len(_CACHE) >= CACHE_MAX_ENTRIES:
        # Drop the oldest entry
        oldest = min(_CACHE, key=lambda k: _CACHE[k][0])
        _CACHE.pop(oldest, None)
    _CACHE[key] = (_t.time(), value)

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


def parse_price_lacs(price_text):
    """Parse a PakWheels price string ('PKR 58.5 lacs', 'PKR 1.2 crore') to lacs."""
    text = str(price_text).lower().replace(",", "").strip()
    m = re.search(r"(\d+(?:\.\d+)?)", text)
    if not m:
        return None
    value = float(m.group(1))
    if "crore" in text:
        return value * 100
    return value  # lacs / lakh, or a bare number treated as lacs


def parse_year_num(year_text):
    m = re.search(r"(\d{4})", str(year_text))
    return int(m.group(1)) if m else None


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


def _new_session():
    """A requests session that behaves like a first-time visitor: we land on
    the homepage first so PakWheels sets its normal cookies, then browse —
    exactly what a human session looks like instead of a cold deep-link hit."""
    import requests
    s = requests.Session()
    s.headers.update(make_headers())
    try:
        s.get("https://www.pakwheels.com/", timeout=TIMEOUT)
    except Exception:
        pass  # priming is best-effort; the search can still proceed
    # Subsequent navigations come "from" the site itself, like a real user
    s.headers.update({"Referer": "https://www.pakwheels.com/", "Sec-Fetch-Site": "same-origin"})
    return s


def _fetch_page(session, brand, model_name, query_bits, page_no):
    """Fetch one PakWheels results page; return raw card rows (unfiltered)."""
    from bs4 import BeautifulSoup

    query = quote_plus(" ".join(query_bits))
    url = f"https://www.pakwheels.com/used-cars/search/-/?q={query}&page={page_no}"
    response = session.get(url, timeout=TIMEOUT)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    return soup.find_all("li", class_=lambda x: x and "classified-listing" in x)


def _brand_model_guard(row, brand, model_name):
    title_lower = row["Title"].lower()
    return brand.lower() in title_lower and model_name.split()[0].lower() in title_lower


def fetch_strict(brand, model_name, trim, year, city):
    """Search-page mode: one page, strict year/city filters (unchanged behavior)."""
    query_bits = [brand, model_name]
    if trim and trim != "Unspecified":
        query_bits.append(trim)
    if year:
        query_bits.append(str(year))
    if city and city != "Other":
        query_bits.append(city)

    session = _new_session()
    cards = _fetch_page(session, brand, model_name, query_bits, 1)
    rows, seen = [], set()
    for card in cards:
        row = parse_listing_card(card, brand, model_name)
        if not _brand_model_guard(row, brand, model_name):
            continue
        if year:
            y = parse_year_num(row["Year"])
            if y is None or y != int(year):
                continue
        if city and city != "Other" and str(row["City"]).strip().lower() != city.lower():
            continue
        key = row["Listing_URL"] or (row["Title"], row["Price"])
        if key in seen:
            continue
        seen.add(key)
        rows.append(row)
        if len(rows) >= SEARCH_MAX_RESULTS:
            break
    return rows


def fetch_similar(brand, model_name, trim):
    """Similar-listings mode: up to SIMILAR_MAX_PAGES pages, brand/model guard only.

    Mirrors the Streamlit app's fetch_similar_listing_page — year/city are left
    out of the query and applied as ranking signals instead of hard filters,
    so price-close listings are never excluded before ranking.

    Results are cached (CACHE_TTL) so repeat views don't re-hit PakWheels.
    """
    cache_key = ("similar", brand, model_name, trim or "")
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    import random

    query_bits = [brand, model_name]
    if trim and trim != "Unspecified":
        query_bits.append(trim)

    session = _new_session()
    rows, seen = [], set()
    start = time.time()
    for page_no in range(1, SIMILAR_MAX_PAGES + 1):
        if page_no > 1:
            # Human-ish pacing between pages — hammering page after page with
            # zero delay is a classic scraper fingerprint.
            time.sleep(random.uniform(0.4, 0.9))
        cards = _fetch_page(session, brand, model_name, query_bits, page_no)
        new_rows = 0
        for card in cards:
            row = parse_listing_card(card, brand, model_name)
            if not _brand_model_guard(row, brand, model_name):
                continue
            key = row["Listing_URL"] or (row["Title"], row["Price"])
            if key in seen:
                continue
            seen.add(key)
            rows.append(row)
            new_rows += 1
            if len(rows) >= SIMILAR_MAX_RESULTS:
                break
        if new_rows == 0:
            break  # source exhausted — no point fetching further pages
        if len(rows) >= SIMILAR_MAX_RESULTS:
            break
        if time.time() - start > FETCH_BUDGET:
            break  # stay comfortably inside the serverless time limit
    _cache_set(cache_key, rows)
    return rows


def rank_similar_listings(rows, generation, city, user_year, predicted_price, low_price, high_price):
    """Streamlit-faithful ranking: price-inside-range + year match first, then
    closest price to the predicted price, then year/city/generation matches."""
    def sort_key(r):
        price_lacs = parse_price_lacs(r.get("Price", ""))
        year_num = parse_year_num(r.get("Year", ""))
        price_match = (
            price_lacs is not None and low_price is not None and high_price is not None
            and low_price <= price_lacs <= high_price
        )
        year_match = year_num is not None and user_year is not None and year_num == user_year
        hybrid = price_match and year_match
        price_diff = abs(price_lacs - predicted_price) if price_lacs is not None and predicted_price is not None else float("inf")
        year_diff = abs(year_num - user_year) if year_num is not None and user_year is not None else float("inf")
        city_match = bool(city and str(r.get("City", "")).strip().lower() == city.lower())
        gen_match = generation_matches_title(generation, r.get("Title", ""))
        return (
            0 if hybrid else 1,
            price_diff,
            year_diff,
            0 if city_match else 1,
            0 if gen_match else 1,
        )

    return sorted(rows, key=sort_key)


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
            mode = get("mode")
            def getf(k):
                try:
                    return float(get(k))
                except (TypeError, ValueError):
                    return None
            predicted_price = getf("predicted_price")
            low_price = getf("low_price")
            high_price = getf("high_price")
        except Exception:
            self._send(400, {"error": "Could not read the search parameters."})
            return

        if not brand or not model_name:
            self._send(400, {"error": "Choose a brand and model to search live listings."})
            return

        try:
            if mode == "similar":
                rows = fetch_similar(brand, model_name, trim)
                user_year = int(year) if year and year.isdigit() else None
                rows = rank_similar_listings(
                    rows, generation, city, user_year,
                    predicted_price, low_price, high_price,
                )
            else:
                rows = fetch_strict(brand, model_name, trim, year, city)
                rows.sort(key=lambda r: (
                    0 if generation_matches_title(generation, r["Title"]) else 1,
                    0 if city and str(r["City"]).strip().lower() == city.lower() else 1,
                ))
            self._send(200, {"listings": rows})
        except Exception:
            # Graceful degradation: PakWheels blocked us, timed out, or changed
            # markup — the UI shows a friendly "unavailable" state, never a crash.
            self._send(503, {"error": UNAVAILABLE_MSG})
