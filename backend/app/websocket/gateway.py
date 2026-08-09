import json
import logging
from typing import Dict, Optional, Set

from fastapi import Query, WebSocket, WebSocketDisconnect

from app.core.security import decode_token

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.robot_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info("WebSocket connected. Total: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)
        # Remove from robot connections if present
        for robot_id, ws in list(self.robot_connections.items()):
            if ws == websocket:
                del self.robot_connections[robot_id]
        logger.info("WebSocket disconnected. Total: %d", len(self.active_connections))

    async def broadcast(self, event_type: str, data: dict) -> None:
        message = json.dumps({"type": event_type, "data": data})
        dead: set[WebSocket] = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead.add(connection)
        
        for dead_conn in dead:
            self.disconnect(dead_conn)

    async def send_to_robot(self, robot_id: str, event_type: str, data: dict) -> bool:
        if robot_id in self.robot_connections:
            try:
                message = json.dumps({"type": event_type, "data": data})
                await self.robot_connections[robot_id].send_text(message)
                return True
            except Exception:
                self.disconnect(self.robot_connections[robot_id])
        return False


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)) -> None:
    if token:
        try:
            decode_token(token)
        except Exception as exc:
            logger.warning("WebSocket token validation failed: %s", exc)
            try:
                await websocket.accept()
                await websocket.close(code=1008, reason="Invalid or expired token")
            except Exception:
                pass
            return

    await manager.connect(websocket)
    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
                msg_type = data.get("type")
                payload = data.get("data", {})
                
                logger.debug("WebSocket received: %s", msg_type)
                
                if msg_type == "register_robot":
                    robot_id = payload.get("robot_id")
                    if robot_id:
                        manager.robot_connections[robot_id] = websocket
                        logger.info("Registered robot %s for directed messaging", robot_id)
                elif msg_type == "robot_command":
                    # Echo command to the whole network for now
                    await manager.broadcast("robot_command", payload)
            except json.JSONDecodeError:
                logger.warning("Received invalid JSON on websocket: %s", data_str)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
