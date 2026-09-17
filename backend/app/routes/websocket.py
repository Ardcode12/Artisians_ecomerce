"""
WebSocket Endpoints for Real-Time Order & Call Status Updates
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.socket_manager import socket_manager

router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws/orders")
async def websocket_orders_endpoint(websocket: WebSocket):
    """
    WebSocket connection endpoint for real-time live order status & call log updates.
    Seller app and Admin dashboard subscribe here.
    """
    await socket_manager.connect(websocket)
    try:
        while True:
            # Keep-alive loop receiving client pings
            data = await websocket.receive_text()
            await websocket.send_json({"type": "pong", "payload": data})
    except WebSocketDisconnect:
        socket_manager.disconnect(websocket)
    except Exception:
        socket_manager.disconnect(websocket)
