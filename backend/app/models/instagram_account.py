import os
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel
from app.db.database import get_db


class InstagramConsentRequest(BaseModel):
    enabled: bool
    user_id: Optional[str] = None


class InstagramAccountData(BaseModel):
    id: Optional[int] = None
    user_id: str
    ig_user_id: str
    ig_username: Optional[str] = None
    access_token: str
    token_expires_at: Optional[str] = None
    account_type: Optional[str] = None
    auto_post_enabled: int = 0
    consent_granted_at: Optional[str] = None
    linked_at: Optional[str] = None
    last_error: Optional[str] = None


def save_account(user_id: str, data: Dict[str, Any]):
    """Insert or update Instagram account linkage for a user."""
    now = datetime.now(timezone.utc).isoformat()
    expires_at = data.get("expires_at")
    if isinstance(expires_at, datetime):
        expires_at_str = expires_at.isoformat()
    else:
        expires_at_str = str(expires_at) if expires_at else None

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO instagram_accounts (
                user_id, ig_user_id, ig_username, access_token,
                token_expires_at, account_type, auto_post_enabled,
                consent_granted_at, linked_at, last_error
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, NULL)
            ON CONFLICT(user_id) DO UPDATE SET
                ig_user_id = excluded.ig_user_id,
                ig_username = excluded.ig_username,
                access_token = excluded.access_token,
                token_expires_at = excluded.token_expires_at,
                account_type = excluded.account_type,
                auto_post_enabled = 1,
                consent_granted_at = excluded.consent_granted_at,
                linked_at = excluded.linked_at,
                last_error = NULL;
        """, (
            user_id,
            data.get("ig_user_id"),
            data.get("ig_username"),
            data.get("access_token"),
            expires_at_str,
            data.get("account_type", "BUSINESS"),
            now,
            now
        ))


def get_linked_account(user_id: Optional[str] = None) -> InstagramAccountData:
    """
    Retrieve linked Instagram account for user.
    Falls back to the common marketplace platform account for all artisans.
    """
    common_username = os.getenv("IG_COMMON_USERNAME", "arti_sanproducts")
    common_app_id = os.getenv("IG_USER_ID") or os.getenv("IG_APP_ID", "")
    access_token = os.getenv("IG_ACCESS_TOKEN", "")

    with get_db() as conn:
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT * FROM instagram_accounts WHERE user_id = ? LIMIT 1;", (user_id,))
            row = cursor.fetchone()
            if row:
                acc = InstagramAccountData(**dict(row))
                if access_token:
                    acc.access_token = access_token
                if common_app_id:
                    acc.ig_user_id = common_app_id
                return acc

        # Check for common platform account in DB
        cursor.execute("SELECT * FROM instagram_accounts WHERE user_id = 'common_platform' LIMIT 1;")
        row = cursor.fetchone()
        if row:
            acc = InstagramAccountData(**dict(row))
            if access_token:
                acc.access_token = access_token
            if common_app_id:
                acc.ig_user_id = common_app_id
            return acc

    # Initialize common platform account
    now = datetime.now(timezone.utc).isoformat()
    return InstagramAccountData(
        user_id="common_platform",
        ig_user_id=common_app_id,
        ig_username=common_username,
        access_token=access_token,
        account_type="BUSINESS",
        auto_post_enabled=1,
        consent_granted_at=now,
        linked_at=now
    )


def set_auto_post(user_id: str, enabled: bool):
    """Enable or disable auto-post reel consent."""
    now = datetime.now(timezone.utc).isoformat() if enabled else None
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE instagram_accounts
            SET auto_post_enabled = ?, consent_granted_at = ?
            WHERE user_id = ?;
        """, (1 if enabled else 0, now, user_id))


def set_account_error(user_id: str, error_msg: str):
    """Update last error for account."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE instagram_accounts SET last_error = ? WHERE user_id = ?;", (error_msg, user_id))


def delete_account(user_id: str):
    """Unlink Instagram account."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM instagram_accounts WHERE user_id = ?;", (user_id,))
