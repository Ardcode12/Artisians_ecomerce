"""
Local SQLite Database Connection Manager
Provides thread-safe connections with WAL mode enabled for high concurrency.
"""

import sqlite3
from contextlib import contextmanager
from typing import Generator
from app.config import DB_PATH


def get_connection() -> sqlite3.Connection:
    """Create a new SQLite connection configured with WAL and Row factory."""
    conn = sqlite3.connect(
        str(DB_PATH),
        timeout=30.0,
        check_same_thread=False
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for safe database transactions."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
