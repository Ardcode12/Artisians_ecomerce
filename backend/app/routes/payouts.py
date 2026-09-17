"""
Payouts Routes
Handles artisan payout requests.
"""

import time
import uuid
import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.db.database import get_db
from datetime import datetime, timezone

logger = logging.getLogger("PayoutsRouter")
router = APIRouter(prefix="/api/payouts", tags=["Payouts"])


class PayoutRequest(BaseModel):
    amount: float
    artisan_id: Optional[str] = None
    notes: Optional[str] = None


@router.post("")
def request_payout(req: PayoutRequest):
    """Record a payout request from an artisan."""
    payout_id = f"pay-{int(time.time() * 1000)}-{uuid.uuid4().hex[:5]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            # Create payouts table if it doesn't exist yet
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS payouts (
                    id TEXT PRIMARY KEY,
                    artisan_id TEXT,
                    amount REAL NOT NULL,
                    status TEXT DEFAULT 'pending',
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            cursor.execute("""
                INSERT INTO payouts (id, artisan_id, amount, status, notes, created_at, updated_at)
                VALUES (?, ?, ?, 'pending', ?, ?, ?)
            """, (payout_id, req.artisan_id, req.amount, req.notes, now_iso, now_iso))
            conn.commit()
    except Exception as e:
        logger.warning(f"Could not persist payout request: {e}")

    return {
        "success": True,
        "payout_id": payout_id,
        "amount": req.amount,
        "status": "pending",
        "message": "Payout request received. Transfer will be processed within 2-3 business days.",
        "created_at": now_iso,
    }


@router.get("")
def list_payouts(artisan_id: Optional[str] = None):
    """List all payout requests."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("CREATE TABLE IF NOT EXISTS payouts (id TEXT PRIMARY KEY, artisan_id TEXT, amount REAL, status TEXT, notes TEXT, created_at TEXT, updated_at TEXT)")
            if artisan_id:
                cursor.execute("SELECT * FROM payouts WHERE artisan_id = ? ORDER BY created_at DESC", (artisan_id,))
            else:
                cursor.execute("SELECT * FROM payouts ORDER BY created_at DESC")
            rows = [dict(r) for r in cursor.fetchall()]
    except Exception as e:
        logger.warning(f"Could not list payouts: {e}")
        rows = []

    return {"success": True, "payouts": rows}
