"""
Instagram OAuth & Account Integration Endpoints
"""

import secrets
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse

from app.services.instagram_service import (
    build_authorize_url,
    exchange_code,
    get_publishing_limit,
)
from app.models.instagram_account import (
    save_account,
    get_linked_account,
    delete_account,
    set_auto_post,
    InstagramConsentRequest,
)

logger = logging.getLogger("InstagramRouter")

router = APIRouter(prefix="/instagram", tags=["Instagram Integration"])

# In-memory OAuth state mapping (state -> user_id)
_OAUTH_STATES: dict = {}


def _get_user_id_from_request(req: Request) -> str:
    """Extract user identifier or fallback to default session user."""
    auth_header = req.headers.get("authorization", "")
    user_header = req.headers.get("x-user-id", "")
    if user_header:
        return user_header
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        if token and len(token) > 5:
            return token
    # Default artisan user id
    return "artisan_default"


@router.get("/auth-url")
def auth_url_endpoint(request: Request, user_id: Optional[str] = Query(None)):
    """Generate Instagram OAuth authorization URL with CSRF state."""
    uid = user_id or _get_user_id_from_request(request)
    state = secrets.token_urlsafe(24)
    _OAUTH_STATES[state] = uid
    url = build_authorize_url(state)
    return {"auth_url": url, "state": state, "user_id": uid}


@router.post("/connect-demo")
def connect_demo_endpoint(request: Request, user_id: Optional[str] = Query(None)):
    """Instantly links a verified Business Instagram demo account for testing/hackathons."""
    from datetime import datetime, timezone, timedelta
    uid = user_id or _get_user_id_from_request(request)
    mock_data = {
        "ig_user_id": "17841400012345678",
        "ig_username": "artisan_crafts_india",
        "account_type": "BUSINESS",
        "access_token": "IGQVJ_DEMO_BUSINESS_TOKEN",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
    }
    save_account(uid, mock_data)
    set_auto_post(uid, True)
    return {
        "linked": True,
        "username": "artisan_crafts_india",
        "account_type": "BUSINESS",
        "auto_post_enabled": True
    }


@router.get("/callback", response_class=HTMLResponse)
def callback_endpoint(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    error_reason: str = Query(None),
    error_description: str = Query(None),
):
    """Handles OAuth 2.0 redirect from Meta / Instagram."""
    if error or error_reason or not code:
        err_msg = error_description or error or "Authorization cancelled by user"
        logger.warning(f"Instagram OAuth error: {err_msg}")
        return _close_page(False, err_msg)

    user_id = _OAUTH_STATES.pop(state, None) or "artisan_default"

    try:
        data = exchange_code(code)
    except Exception as e:
        logger.error(f"Failed to exchange Instagram code: {e}")
        return _close_page(False, str(e))

    account_type = (data.get("account_type") or "").upper()
    if account_type and account_type not in ("BUSINESS", "MEDIA_CREATOR", "CREATOR"):
        return _close_page(
            False,
            "Personal accounts are not supported by Instagram for Reel auto-publishing. "
            "Please switch to a Professional (Creator or Business) account in your Instagram settings."
        )

    save_account(user_id, data)
    username = data.get("ig_username", "Instagram Creator")
    logger.info(f"User {user_id} successfully linked Instagram account: @{username}")
    return _close_page(True, username)


@router.get("/status")
def status_endpoint(request: Request, user_id: Optional[str] = Query(None)):
    """Check Instagram connection status for active user."""
    uid = user_id or _get_user_id_from_request(request)
    acc = get_linked_account(uid)
    if not acc:
        return {"linked": False, "auto_post_enabled": False}

    return {
        "linked": True,
        "username": acc.ig_username,
        "account_type": acc.account_type,
        "auto_post_enabled": bool(acc.auto_post_enabled),
        "linked_at": acc.linked_at,
        "expires_at": acc.token_expires_at,
        "last_error": acc.last_error,
    }


@router.post("/consent")
def consent_endpoint(
    req: Optional[InstagramConsentRequest] = None,
    enabled: Optional[bool] = Query(None),
    user_id: Optional[str] = Query(None),
    request: Request = None,
):
    """Toggle auto-posting consent for Reels."""
    uid = (req.user_id if req and req.user_id else None) or user_id or _get_user_id_from_request(request)
    acc = get_linked_account(uid)
    if not acc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No linked Instagram account found for this user"
        )

    is_enabled = req.enabled if req else (enabled if enabled is not None else True)
    set_auto_post(uid, is_enabled)
    return {"success": True, "auto_post_enabled": is_enabled}


@router.delete("/unlink")
def unlink_endpoint(request: Request, user_id: Optional[str] = Query(None)):
    """Disconnect Instagram account linkage."""
    uid = user_id or _get_user_id_from_request(request)
    delete_account(uid)
    return {"success": True, "linked": False}


@router.get("/quota")
def quota_endpoint(request: Request, user_id: Optional[str] = Query(None)):
    """Get remaining publishing quota from Instagram Graph API."""
    uid = user_id or _get_user_id_from_request(request)
    acc = get_linked_account(uid)
    if not acc:
        raise HTTPException(status_code=404, detail="No Instagram account linked")
    return get_publishing_limit(acc)


def _close_page(ok: bool, msg: str) -> str:
    """Render confirmation page that automatically closes the in-app browser."""
    icon = "✨" if ok else "⚠️"
    title = "Instagram Connected!" if ok else "Connection Notice"
    body = f"Successfully linked as @{msg}" if ok else msg
    badge_color = "#15803D" if ok else "#DC2626"

    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>{title}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #FDFBF7;
      text-align: center;
      padding: 24px;
      box-sizing: border-box;
    }}
    .card {{
      background: #ffffff;
      border-radius: 24px;
      padding: 36px 24px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.06);
      max-width: 380px;
      width: 100%;
      border: 1px solid #EAE6DF;
    }}
    .icon {{ font-size: 54px; margin-bottom: 12px; }}
    h2 {{ margin: 12px 0 8px; color: #1A1A1A; font-size: 22px; }}
    p {{ color: #555555; margin: 0 0 20px; font-size: 15px; line-height: 1.4; }}
    .badge {{
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 700;
      color: #ffffff;
      background-color: {badge_color};
      font-size: 14px;
      margin-bottom: 20px;
    }}
    .close-btn {{
      display: inline-block;
      width: 100%;
      background: #C13584;
      color: #fff;
      font-weight: 700;
      padding: 14px 0;
      border-radius: 12px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      font-size: 15px;
    }}
    .subtext {{ font-size: 12px; color: #9A9A9A; margin-top: 14px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">{icon}</div>
    <h2>{title}</h2>
    <div class="badge">{'Verified' if ok else 'Action Required'}</div>
    <p>{body}</p>
    <button class="close-btn" onclick="window.close()">Return to Artisans App</button>
    <div class="subtext">This window will close automatically...</div>
  </div>
  <script>
    setTimeout(function() {{
      try {{ window.close(); }} catch(e) {{}}
    }}, 2000);
  </script>
</body>
</html>"""
