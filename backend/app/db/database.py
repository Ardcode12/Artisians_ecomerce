"""Database connection manager for local SQLite or PostgreSQL."""

import sqlite3
from contextlib import contextmanager
from typing import Any, Generator
from app.config import DATABASE_URL, DB_PATH

if DATABASE_URL.startswith(("postgresql://", "postgres://")):
    import psycopg
    from psycopg.rows import dict_row


def is_postgres() -> bool:
    return DATABASE_URL.startswith(("postgresql://", "postgres://"))


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
