"""
Instagram Graph API Content Publishing Service
Manages OAuth 2.0 authorization, token exchange, and 3-step Reel publishing.
"""

import os
import time
import logging
from typing import Optional
from datetime import datetime, timezone, timedelta
import httpx
from app.models.instagram_account import get_linked_account, save_account, delete_account

logger = logging.getLogger("InstagramService")

APP_ID = os.getenv("IG_APP_ID", "")
APP_SECRET = os.getenv("IG_APP_SECRET", "")
REDIRECT = os.getenv("IG_REDIRECT_URI", "")
GRAPH = os.getenv("IG_GRAPH_BASE", "https://graph.instagram.com")

SCOPES = "instagram_business_basic,instagram_business_content_publish"


def build_authorize_url(state: str) -> str:
    """Generate the OAuth authorization URL."""
    app_id = os.getenv("IG_APP_ID", "")
    redirect = os.getenv("IG_REDIRECT_URI", "")
    if not app_id or app_id == "xxxxx":
        # Mock auth URL for local dev/demo
        from app.config import PUBLIC_BASE_URL
        return f"{PUBLIC_BASE_URL}/api/instagram/callback?code=mock_code_123&state={state}"

    return (
        "https://www.instagram.com/oauth/authorize"
        f"?client_id={app_id}"
        f"&redirect_uri={redirect}"
        f"&scope={SCOPES}"
        f"&response_type=code"
        f"&state={state}"
    )


def exchange_code(code: str) -> dict:
    """Exchange auth code for long-lived (60 day) access token and profile info."""
    app_id = os.getenv("IG_APP_ID", "")
    app_secret = os.getenv("IG_APP_SECRET", "")
    redirect = os.getenv("IG_REDIRECT_URI", "")

    # If mock/demo code or keys are not configured
    if code == "mock_code_123" or not app_id or app_id == "xxxxx":
        logger.info("Using simulated Instagram account connection for demo.")
        return {
            "ig_user_id": "17841400012345678",
            "ig_username": "artisan_crafts_india",
            "account_type": "BUSINESS",
            "access_token": "IGQVJ_MOCK_LONG_LIVED_TOKEN_5184000",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
        }

    with httpx.Client(timeout=30) as c:
        # Step 1: Exchange code for short-lived token
        r = c.post("https://api.instagram.com/oauth/access_token", data={
            "client_id": app_id,
            "client_secret": app_secret,
            "grant_type": "authorization_code",
            "redirect_uri": redirect,
            "code": code,
        })
        _raise_ig(r)
        short = r.json()

        # Step 2: Exchange for long-lived (60-day) token
        r2 = c.get(f"{GRAPH}/access_token", params={
            "grant_type": "ig_exchange_token",
            "client_secret": app_secret,
            "access_token": short["access_token"],
        })
        _raise_ig(r2)
        long_token_data = r2.json()

        # Step 3: Fetch profile info
        r3 = c.get(f"{GRAPH}/me", params={
            "fields": "id,username,account_type",
            "access_token": long_token_data["access_token"],
        })
        _raise_ig(r3)
        me = r3.json()

    expires_in = long_token_data.get("expires_in", 5184000)
    return {
        "ig_user_id": me["id"],
        "ig_username": me.get("username", "artisan"),
        "account_type": me.get("account_type", "BUSINESS"),
        "access_token": long_token_data["access_token"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat(),
    }


def refresh_token(token: str) -> dict:
    """Refresh long-lived access token before 60-day expiry."""
    with httpx.Client(timeout=30) as c:
        r = c.get(f"{GRAPH}/refresh_access_token", params={
            "grant_type": "ig_refresh_token",
            "access_token": token,
        })
        _raise_ig(r)
        d = r.json()
    return {
        "access_token": d["access_token"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=d.get("expires_in", 5184000))).isoformat()
    }


def _robust_request(client: httpx.Client, method: str, url: str, **kwargs) -> httpx.Response:
    """Execute HTTP request with automatic retry for transient socket/connection errors."""
    last_err = None
    for attempt in range(3):
        try:
            return client.request(method, url, **kwargs)
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError, httpx.NetworkError) as e:
            last_err = e
            logger.warning(f"Meta Graph API transient network error on attempt {attempt+1}: {e}. Retrying in 2s...")
            time.sleep(2)
    raise last_err


def publish_reel(account, video_url: str, caption: str,
                 share_to_feed: bool = True) -> dict:
    """
    Publish a vertical video as an Instagram Reel using the official Meta Instagram Graph API:
      1. POST /{ig_user_id}/media with media_type=REELS, video_url=<Cloudinary URL>, caption
      2. Poll GET /{creation_id}?fields=status_code,status until FINISHED
      3. POST /{ig_user_id}/media_publish with creation_id
      4. Fetch real permalink from GET /{media_id}?fields=permalink
    """
    token = os.getenv("IG_ACCESS_TOKEN") or getattr(account, "access_token", "")
    ig_id = os.getenv("IG_USER_ID") or getattr(account, "ig_user_id", "") or "39192199770371201"

    if not token or not ig_id or token.startswith("IGQVJ_") or ig_id == "xxxxx":
        raise RuntimeError(
            "Missing Meta Instagram credentials. Please set valid IG_USER_ID and IG_ACCESS_TOKEN in backend/.env"
        )

    logger.info(f"Publishing Reel via Meta Graph API for Instagram User ID: {ig_id}...")
    logger.info(f"Video URL (Cloudinary): {video_url}")

    with httpx.Client(timeout=90) as c:
        # Step 1 & 2: Create media container & poll until finished (with 1 retry on ingestion error)
        creation_id = None
        for attempt in range(2):
            container_url = f"{GRAPH}/{ig_id}/media"
            container_data = {
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption[:2200],
                "share_to_feed": "true" if share_to_feed else "false",
                "access_token": token,
            }
            logger.info(f"Step 1: Creating Reel container on Meta Graph API (attempt {attempt+1}): {container_url}")
            r = _robust_request(c, "POST", container_url, data=container_data)
            _raise_ig(r)
            res_json = r.json()
            creation_id = res_json.get("id")
            if not creation_id:
                raise RuntimeError(f"Meta Graph API did not return a creation_id: {res_json}")
            logger.info(f"Step 1 Success: Container ID = {creation_id}")

            # Step 2: Poll status until processing is FINISHED
            deadline = time.time() + 180
            poll_interval = 4
            logger.info("Step 2: Polling container processing status...")
            ingestion_error = False
            while time.time() < deadline:
                time.sleep(poll_interval)
                status_resp = _robust_request(
                    c, "GET",
                    f"{GRAPH}/{creation_id}",
                    params={"fields": "status_code,status", "access_token": token}
                )
                _raise_ig(status_resp)
                status_data = status_resp.json()
                code = status_data.get("status_code")
                logger.info(f"Container {creation_id} status: {code} ({status_data.get('status')})")
                if code == "FINISHED":
                    break
                if code in ("ERROR", "EXPIRED"):
                    detail = status_data.get("status", "Unknown processing failure")
                    if attempt == 0:
                        logger.warning(f"Ingestion failed on first attempt: {detail}. Waiting 4s and retrying...")
                        ingestion_error = True
                        time.sleep(4)
                        break
                    else:
                        raise RuntimeError(f"Instagram rejected video during ingestion: {code} - {detail}")
            else:
                if not ingestion_error:
                    raise TimeoutError("Instagram video processing timed out after 3 minutes")

            if not ingestion_error:
                break

        # Step 3: Publish container
        publish_url = f"{GRAPH}/{ig_id}/media_publish"
        logger.info(f"Step 3: Calling media_publish on {publish_url} for container {creation_id}...")
        p = _robust_request(c, "POST", publish_url, data={"creation_id": creation_id, "access_token": token})
        _raise_ig(p)
        pub_json = p.json()
        media_id = pub_json.get("id")
        if not media_id:
            raise RuntimeError(f"Meta Graph API media_publish did not return a media_id: {pub_json}")
        logger.info(f"Step 3 Success: Published Media ID = {media_id}")

        # Step 4: Fetch real permalink
        permalink = None
        try:
            pl_resp = c.get(
                f"{GRAPH}/{media_id}",
                params={"fields": "permalink", "access_token": token}
            )
            if pl_resp.status_code == 200:
                permalink = pl_resp.json().get("permalink")
        except Exception as e:
            logger.warning(f"Could not retrieve permalink for media {media_id}: {e}")

        if not permalink:
            permalink = f"https://www.instagram.com/reel/{media_id}/"

        logger.info(f"Reel is LIVE on Instagram! Permalink: {permalink}")
        return {
            "creation_id": creation_id,
            "media_id": media_id,
            "permalink": permalink,
        }


def get_publishing_limit(account) -> dict:
    """Check Instagram 24h publishing quota."""
    token = getattr(account, "access_token", "")
    ig_id = getattr(account, "ig_user_id", "")
    if not token or token.startswith("IGQVJ_MOCK"):
        return {"quota_usage": 1, "config": {"quota_total": 50, "quota_duration": 86400}}

    with httpx.Client(timeout=20) as c:
        r = c.get(f"{GRAPH}/{ig_id}/content_publishing_limit", params={
            "fields": "config,quota_usage",
            "access_token": token
        })
        return r.json()


def _raise_ig(resp: httpx.Response):
    if resp.status_code >= 400:
        try:
            err = resp.json().get("error", {})
            msg = err.get("message", "Instagram API error")
            code = err.get("code")
            raise RuntimeError(f"IG {code}: {msg}")
        except ValueError:
            resp.raise_for_status()
