"""
Scheme Discovery Services package.
"""

from app.services.schemes.collector import (
    collect_all_sources,
    fetch_from_api,
    fetch_from_web,
    fetch_from_pdf,
)

__all__ = [
    "collect_all_sources",
    "fetch_from_api",
    "fetch_from_web",
    "fetch_from_pdf",
]
