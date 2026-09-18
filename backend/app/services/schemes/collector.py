"""
Multi-Source Data Collector for Scheme Discovery (Step 1).

Fetches raw scheme information from government and NGO sources using:
  - fetch_from_api: structured API endpoints
  - fetch_from_web: HTML scraping with BeautifulSoup and robots.txt compliance
  - fetch_from_pdf: PDF circular downloading and text extraction via pdfplumber

All functions return a consistent result format:
{
    "source_name": str,
    "source_url": str,
    "source_type": "api" | "web" | "pdf",
    "status": "success" | "failed" | "skipped",
    "raw_content": Optional[str],
    "error_message": Optional[str]
}

No AI extraction, database storage, API endpoints, or UI are implemented here.
"""

import io
import json
import logging
import time
import urllib.robotparser
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import requests
import urllib3
from bs4 import BeautifulSoup

# Suppress insecure SSL warnings for government portals with self-signed or non-standard CA roots
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configure logger
logger = logging.getLogger("SchemeCollector")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# Session configuration with standard browser User-Agent
_DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

_SESSION = requests.Session()
_SESSION.headers.update({
    "User-Agent": _DEFAULT_USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/json,application/pdf;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
})

# Timeouts: (connect_timeout, read_timeout) in seconds
DEFAULT_TIMEOUT = (5, 10)
CRAWL_DELAY = 1.0  # seconds between successive requests to the same domain


# ── robots.txt Compliance Cache ───────────────────────────────────────────────

_robots_cache: Dict[str, urllib.robotparser.RobotFileParser] = {}


def check_robots_allowed(url: str, user_agent: str = "*") -> Tuple[bool, Optional[str]]:
    """
    Checks robots.txt for the given URL using urllib.robotparser.
    
    Returns:
        (is_allowed: bool, reason: Optional[str])
    """
    try:
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"

        if base not in _robots_cache:
            rp = urllib.robotparser.RobotFileParser()
            robots_url = urljoin(base, "/robots.txt")
            try:
                resp = _SESSION.get(robots_url, timeout=(4, 5), verify=False)
                if resp.status_code == 200 and resp.text:
                    rp.parse(resp.text.splitlines())
                elif resp.status_code in (401, 403):
                    # Explicit authorization denied for robots.txt
                    return False, f"HTTP {resp.status_code} on robots.txt for {base}"
                else:
                    # 404 or missing robots.txt implies no crawl restrictions
                    rp.parse([])
            except Exception as e:
                # Network or SSL error while fetching robots.txt; allow crawler by convention
                logger.debug(f"Could not fetch robots.txt for {base} ({e}); defaulting to allowed")
                rp.parse([])

            _robots_cache[base] = rp

        parser = _robots_cache[base]
        # Test specific user-agent first, fall back to wildcard
        is_allowed = parser.can_fetch(user_agent, url) or parser.can_fetch("*", url)
        if not is_allowed:
            return False, f"Disallowed by {base}/robots.txt rules"
        return True, None

    except Exception as e:
        logger.warning(f"Error evaluating robots.txt for {url}: {e}")
        return True, None


# ── HTML Content Cleaning Helper ─────────────────────────────────────────────

def _clean_html_text(html: str) -> str:
    """
    Strips noise (scripts, styles, headers, footers, nav) and extracts readable text.
    """
    soup = BeautifulSoup(html, "lxml")

    # Remove non-content tags
    for tag in soup.find_all(["script", "style", "nav", "header", "footer", "aside", "form", "noscript"]):
        tag.decompose()

    # Prioritize main content containers if present
    content_root = (
        soup.find("main") or
        soup.find(id=lambda i: i and any(k in i.lower() for k in ["content", "main", "scheme"])) or
        soup.find(class_=lambda c: c and any(k in str(c).lower() for k in ["content", "main", "scheme"])) or
        soup.find("body") or
        soup
    )

    lines = []
    for elem in content_root.find_all(["h1", "h2", "h3", "h4", "p", "li", "td", "th", "div", "span"]):
        text = elem.get_text(separator=" ", strip=True)
        # Filter out very short noise fragments
        if len(text) >= 30:
            lines.append(text)

    # Deduplicate lines while maintaining original page order
    seen = set()
    cleaned = []
    for line in lines:
        if line not in seen:
            seen.add(line)
            cleaned.append(line)

    return "\n".join(cleaned)


# ── Core Collector Functions ──────────────────────────────────────────────────

def fetch_from_api(
    source_url: str,
    params: Optional[Dict[str, Any]] = None,
    source_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fetches structured scheme information from an API endpoint.

    Returns:
        Consistent result dict with keys:
        source_name, source_url, source_type, status, raw_content, error_message
    """
    name = source_name or "API Source"
    result: Dict[str, Any] = {
        "source_name": name,
        "source_url": source_url,
        "source_type": "api",
        "status": "failed",
        "raw_content": None,
        "error_message": None,
    }

    try:
        logger.info(f"[API] Fetching: {name} ({source_url})")
        resp = _SESSION.get(source_url, params=params, timeout=DEFAULT_TIMEOUT, verify=False)
        resp.raise_for_status()

        data = resp.json()
        raw_text = json.dumps(data, ensure_ascii=False, indent=2)
        result["status"] = "success"
        result["raw_content"] = raw_text
        logger.info(f"[API] Successfully fetched {name} ({len(raw_text)} chars)")
        return result

    except requests.exceptions.HTTPError as e:
        msg = f"HTTP Error {e.response.status_code}: {e.response.text[:200]}"
        logger.warning(f"[API] Failed {name}: {msg}")
        result["error_message"] = msg
        return result
    except requests.exceptions.Timeout:
        msg = "Request timed out"
        logger.warning(f"[API] Failed {name}: {msg}")
        result["error_message"] = msg
        return result
    except Exception as e:
        msg = f"{type(e).__name__}: {str(e)[:200]}"
        logger.warning(f"[API] Failed {name}: {msg}")
        result["error_message"] = msg
        return result


def fetch_from_web(
    url: str,
    source_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Scrapes an HTML page using BeautifulSoup, respecting robots.txt.

    Returns:
        Consistent result dict with keys:
        source_name, source_url, source_type, status, raw_content, error_message
    """
    name = source_name or "Web Source"
    result: Dict[str, Any] = {
        "source_name": name,
        "source_url": url,
        "source_type": "web",
        "status": "failed",
        "raw_content": None,
        "error_message": None,
    }

    # Step 1: Check robots.txt compliance
    allowed, skip_reason = check_robots_allowed(url, user_agent=_DEFAULT_USER_AGENT)
    if not allowed:
        logger.warning(f"[WEB] Skipped {name} ({url}): {skip_reason}")
        result["status"] = "skipped"
        result["error_message"] = skip_reason
        return result

    # Step 2: Fetch and parse HTML
    try:
        logger.info(f"[WEB] Fetching: {name} ({url})")
        resp = _SESSION.get(url, timeout=DEFAULT_TIMEOUT, verify=False)
        resp.raise_for_status()

        clean_text = _clean_html_text(resp.text)
        if len(clean_text) < 50:
            result["status"] = "skipped"
            result["error_message"] = "Insufficient content extracted from page"
            result["raw_content"] = clean_text or None
            logger.warning(f"[WEB] Insufficient content for {name} ({len(clean_text)} chars)")
            return result

        result["status"] = "success"
        result["raw_content"] = clean_text
        logger.info(f"[WEB] Successfully scraped {name} ({len(clean_text)} chars)")
        return result

    except requests.exceptions.HTTPError as e:
        msg = f"HTTP {e.response.status_code}"
        logger.warning(f"[WEB] Failed {name}: {msg}")
        result["error_message"] = msg
        return result
    except requests.exceptions.Timeout:
        msg = "Connection timed out"
        logger.warning(f"[WEB] Failed {name}: {msg}")
        result["error_message"] = msg
        return result
    except Exception as e:
        msg = f"{type(e).__name__}: {str(e)[:200]}"
        logger.warning(f"[WEB] Failed {name}: {msg}")
        result["error_message"] = msg
        return result


def fetch_from_pdf(
    pdf_url: str,
    source_name: Optional[str] = None,
    max_pages: int = 20
) -> Dict[str, Any]:
    """
    Downloads a PDF circular and extracts text using pdfplumber.

    Returns:
        Consistent result dict with keys:
        source_name, source_url, source_type, status, raw_content, error_message
    """
    name = source_name or "PDF Circular"
    result: Dict[str, Any] = {
        "source_name": name,
        "source_url": pdf_url,
        "source_type": "pdf",
        "status": "failed",
        "raw_content": None,
        "error_message": None,
    }

    # Step 1: Check robots.txt compliance
    allowed, skip_reason = check_robots_allowed(pdf_url, user_agent=_DEFAULT_USER_AGENT)
    if not allowed:
        logger.warning(f"[PDF] Skipped {name} ({pdf_url}): {skip_reason}")
        result["status"] = "skipped"
        result["error_message"] = skip_reason
        return result

    # Step 2: Download and extract PDF text
    try:
        import pdfplumber

        logger.info(f"[PDF] Fetching: {name} ({pdf_url})")
        resp = _SESSION.get(pdf_url, timeout=(5, 15), verify=False)
        resp.raise_for_status()

        pages_extracted: List[str] = []
        with pdfplumber.open(io.BytesIO(resp.content)) as pdf:
            total_pages = len(pdf.pages)
            limit = min(total_pages, max_pages)
            for i in range(limit):
                page_text = pdf.pages[i].extract_text()
                if page_text:
                    pages_extracted.append(page_text.strip())

        extracted_text = "\n\n".join(pages_extracted).strip()
        if not extracted_text:
            result["status"] = "skipped"
            result["error_message"] = "PDF contained no extractable text (scanned image or empty)"
            return result

        result["status"] = "success"
        result["raw_content"] = extracted_text
        logger.info(
            f"[PDF] Successfully extracted {name}: {len(extracted_text)} chars from {len(pages_extracted)} pages"
        )
        return result

    except requests.exceptions.HTTPError as e:
        msg = f"HTTP {e.response.status_code}"
        logger.warning(f"[PDF] Failed {name}: {msg}")
        result["error_message"] = msg
        return result
    except requests.exceptions.Timeout:
        msg = "Download timed out"
        logger.warning(f"[PDF] Failed {name}: {msg}")
        result["error_message"] = msg
        return result
    except Exception as e:
        msg = f"{type(e).__name__}: {str(e)[:200]}"
        logger.warning(f"[PDF] Failed {name}: {msg}")
        result["error_message"] = msg
        return result


# ── Top-Level Orchestrator ───────────────────────────────────────────────────

# Configured target sources per requirements:
# Government:
#   - data.gov.in (MSME API)
#   - KVIC (https://kvic.gov.in/kvicres/schemes)
#   - DC Handicrafts (https://handicrafts.nic.in)
#   - PM Vishwakarma (https://pmvishwakarma.gov.in)
#   - PM Vishwakarma Official Guidelines PDF Circular
# NGO / Private:
#   - Craftmark / WCC (https://craftmark.in -> https://www.craftmark.org)
#   - Dastkari Haat Samiti (https://dastkari.in)
#   - Industree Foundation (https://industree.org)
#   - Dastkar (https://dastkar.org)

TARGET_SOURCES = [
    # 1. Government: data.gov.in MSME dataset API
    # Note: Public API requires an API key in query params; returns HTTP 403 when unauthenticated
    {
        "name": "data.gov.in MSME Datasets (API)",
        "url": "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
        "type": "api",
        "params": {"format": "json", "limit": "5"},
    },
    # 2. Government: PM Vishwakarma Portal
    # Verified reachable; returns comprehensive scheme overview and benefits for traditional artisans
    {
        "name": "PM Vishwakarma Portal",
        "url": "https://pmvishwakarma.gov.in",
        "type": "web",
    },
    # 3. Government: PM Vishwakarma Scheme Official Guidelines (PDF Circular)
    # Verified reachable; official 64-page circular detailing scheme eligibility and loan assistance
    {
        "name": "PM Vishwakarma Guidelines Circular (PDF)",
        "url": "https://pmvishwakarma.gov.in/cdn/MiscFiles/eng_v30.0_PM_Vishwakarma_Guidelines_final.pdf",
        "type": "pdf",
    },
    # 4. Government: KVIC Schemes
    # Note: Target URL https://kvic.gov.in/kvicres/schemes returns HTTP 404;
    # Included per spec to verify behavior. Collector will report HTTP 404 failure gracefully.
    {
        "name": "KVIC Schemes",
        "url": "https://kvic.gov.in/kvicres/schemes",
        "type": "web",
    },
    # 5. Government: DC Handicrafts
    # Note: Target URL https://handicrafts.nic.in times out on direct connections due to NIC firewall.
    # Included per spec to verify behavior. Collector catches timeout and logs failed gracefully.
    {
        "name": "DC Handicrafts",
        "url": "https://handicrafts.nic.in",
        "type": "web",
    },
    # 6. NGO: Dastkar
    # Verified reachable; NGO supporting artisan communities and craft bazaars
    {
        "name": "Dastkar NGO",
        "url": "https://dastkar.org",
        "type": "web",
    },
    # 7. NGO: Dastkari Haat Samiti
    # Verified reachable; national association of Indian crafts persons
    {
        "name": "Dastkari Haat Samiti",
        "url": "https://dastkari.in",
        "type": "web",
    },
    # 8. NGO: Industree Foundation
    # Verified reachable; builds sustainable livelihoods for women artisans
    {
        "name": "Industree Foundation",
        "url": "https://industree.org",
        "type": "web",
    },
    # 9. NGO: Craftmark / WCC
    # Note: Specified domain https://craftmark.in fails DNS resolution; fallback to official https://www.craftmark.org
    {
        "name": "Craftmark",
        "url": "https://www.craftmark.org",
        "type": "web",
    },
]


def collect_all_sources(sources: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Runs all collectors across the configured government and NGO sources.
    
    This is the only function later steps (extractor, matcher, scheduler) will call.

    Returns:
        List of result dictionaries conforming to:
        {
            "source_name": str,
            "source_url": str,
            "source_type": "api" | "web" | "pdf",
            "status": "success" | "failed" | "skipped",
            "raw_content": Optional[str],
            "error_message": Optional[str]
        }
    """
    to_run = sources if sources is not None else TARGET_SOURCES
    results: List[Dict[str, Any]] = []

    logger.info(f"Starting Scheme Discovery data collection across {len(to_run)} sources...")

    for src in to_run:
        name = src.get("name", "Unknown Source")
        url = src.get("url", "")
        stype = src.get("type", "web")

        if stype == "api":
            res = fetch_from_api(url, params=src.get("params"), source_name=name)
        elif stype == "web":
            res = fetch_from_web(url, source_name=name)
        elif stype == "pdf":
            res = fetch_from_pdf(url, source_name=name)
        else:
            logger.warning(f"Unknown source type '{stype}' for {name}")
            res = {
                "source_name": name,
                "source_url": url,
                "source_type": stype,
                "status": "failed",
                "raw_content": None,
                "error_message": f"Unsupported source type: {stype}",
            }

        results.append(res)
        time.sleep(CRAWL_DELAY)

    successful = sum(1 for r in results if r["status"] == "success")
    failed = sum(1 for r in results if r["status"] == "failed")
    skipped = sum(1 for r in results if r["status"] == "skipped")
    logger.info(
        f"Collector run finished. Total: {len(results)} | Succeeded: {successful} | "
        f"Failed: {failed} | Skipped: {skipped}"
    )

    return results
