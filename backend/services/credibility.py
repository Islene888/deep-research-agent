"""
Source credibility scoring.
Scores each source 0.0–1.0 based on domain tier and URL patterns.
Used to compute per-finding confidence and displayed as dots in the frontend.
"""
from urllib.parse import urlparse

_TIER_1 = {
    "reuters.com", "bloomberg.com", "ft.com", "wsj.com",
    "sec.gov", "federalreserve.gov", "bis.org",
    "economist.com", "businessinsider.com",
    "ir.nvidia.com", "investor.apple.com",   # official IR pages
}

_TIER_2 = {
    "cnbc.com", "marketwatch.com", "seekingalpha.com",
    "fool.com", "barrons.com", "thestreet.com",
    "techcrunch.com", "venturebeat.com", "wired.com",
    "forbs.com", "fortune.com", "cnn.com",
}

# Domains that look official but are low-quality (forums, social)
_DOWNGRADE = {"reddit.com", "twitter.com", "x.com", "quora.com", "medium.com"}


def score_source(url: str) -> float:
    """Return a credibility score 0.0–1.0 for a given URL."""
    try:
        domain = urlparse(url).netloc.lower().lstrip("www.")
    except Exception:
        return 0.3

    if domain in _DOWNGRADE:
        return 0.2

    # Check full domain and parent domain
    for candidate in [domain, _parent_domain(domain)]:
        if candidate in _TIER_1:
            return 1.0
        if candidate in _TIER_2:
            return 0.7

    # .gov and .edu get a credibility boost
    if domain.endswith(".gov") or domain.endswith(".edu"):
        return 0.9

    return 0.45  # unknown — middle ground


def score_sources(sources: list[dict]) -> list[dict]:
    """Attach credibility_score to each source in the list."""
    return [
        {**s, "credibility_score": score_source(s.get("url", ""))}
        for s in sources
    ]


def _parent_domain(domain: str) -> str:
    parts = domain.split(".")
    return ".".join(parts[-2:]) if len(parts) > 2 else domain
