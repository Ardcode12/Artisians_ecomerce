#!/usr/bin/env python3
"""
Artisans Marketplace Server Runner
Starts the FastAPI application on port 5000 (or PORT env var) with Uvicorn.
"""

import os
import sys
import uvicorn
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Ensure backend root is in PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import PORT, HOST

if __name__ == "__main__":
    print(f"============================================================")
    print(f"   Artisans Marketplace FastAPI Backend")
    print(f"   Database: Local SQLite on-device (data/artisans.db)")
    print(f"   Server: http://localhost:{PORT}")
    print(f"============================================================")
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
