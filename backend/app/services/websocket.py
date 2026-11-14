"""
WebSocket Connection Manager
Handles real-time client connections and broadcasts live location updates.
Adheres strictly to docs/API_CONTRACT.md WebSocket protocol.
"""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("uvicorn.error")


class ConnectionManager:
    """Manages active WebSocket connections from monitoring dashboards."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Accepts a new WebSocket connection and sends an initial ACK."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

        # Send connection acknowledgement conforming to API_CONTRACT.md
        ack_message = {
            "type": "connection_ack",
            "message": "Connected to location tracking server",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await websocket.send_json(ack_message)

    def disconnect(self, websocket: WebSocket):
        """Removes a disconnected WebSocket client."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts a JSON payload to all connected clients, pruning stale connections."""
        if not self.active_connections:
            return

        dead_connections: List[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to client ({e}); marking for removal.")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

    async def broadcast_location(self, payload: Dict[str, Any]):
        """Helper to broadcast a location_update event."""
        message = {
            "type": "location_update",
            "data": payload
        }
        await self.broadcast(message)


# Singleton instance
ws_manager = ConnectionManager()
