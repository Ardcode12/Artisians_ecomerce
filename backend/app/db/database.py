"""Database connection manager for local SQLite or PostgreSQL."""

import logging
import sqlite3
from contextlib import contextmanager
from typing import Any, Generator
from app.config import DATABASE_URL, DB_PATH

logger = logging.getLogger("ArtisansApp")

_POSTGRES_AVAILABLE = None

if DATABASE_URL.startswith(("postgresql://", "postgres://")):
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError:
        psycopg = None
else:
    psycopg = None


def is_postgres() -> bool:
    global _POSTGRES_AVAILABLE
    if _POSTGRES_AVAILABLE is not None:
        return _POSTGRES_AVAILABLE

    if not psycopg or not DATABASE_URL.startswith(("postgresql://", "postgres://")):
        _POSTGRES_AVAILABLE = False
        return False

    try:
        conn = psycopg.connect(DATABASE_URL, connect_timeout=3)
        conn.close()
        _POSTGRES_AVAILABLE = True
        logger.info("[DATABASE] Connected to PostgreSQL successfully.")
        return True
    except Exception as e:
        logger.warning(
            f"[DATABASE] PostgreSQL connection failed ({e}). Falling back to local SQLite at {DB_PATH}"
        )
        _POSTGRES_AVAILABLE = False
        return False


def get_connection() -> Any:
    """Create a connection for the configured database backend."""
    if is_postgres():
        return psycopg.connect(DATABASE_URL, row_factory=dict_row)

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


class DatabaseCursor:
    """Adapt the existing qmark SQL style for psycopg."""

    def __init__(self, cursor: Any):
        self._cursor = cursor

    def execute(self, query: str, params: Any = None) -> Any:
        if is_postgres():
            query = query.replace("?", "%s")
        if params is None:
            return self._cursor.execute(query)
        return self._cursor.execute(query, params)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._cursor, name)


class DatabaseConnection:
    def __init__(self, connection: Any):
        self._connection = connection

    def cursor(self) -> DatabaseCursor:
        return DatabaseCursor(self._connection.cursor())

    def __getattr__(self, name: str) -> Any:
        return getattr(self._connection, name)


@contextmanager
def get_db() -> Generator[DatabaseConnection, None, None]:
    """Context manager for safe database transactions."""
    conn = get_connection()
    wrapped_conn = DatabaseConnection(conn)
    try:
        yield wrapped_conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
