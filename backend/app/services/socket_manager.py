"""
WebSocket Manager Service
Tracks connected seller app and admin dashboard WebSockets and broadcasts live updates.
"""

import logging
from typing import List
from fastapi import WebSocket

logger = logging.getLogger("SocketManager")


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"[WEBSOCKET CONNECTED] Active clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"[WEBSOCKET DISCONNECTED] Active clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast JSON message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"[WEBSOCKET BROADCAST ERROR] {e}")
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)


socket_manager = ConnectionManager()
