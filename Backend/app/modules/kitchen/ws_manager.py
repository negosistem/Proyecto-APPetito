"""
WebSocket connection manager segmentado por empresa.
"""

from collections import defaultdict
import logging
from typing import DefaultDict, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class KitchenConnectionManager:
    """Gestiona conexiones WebSocket activas agrupadas por empresa."""

    def __init__(self) -> None:
        self.active_connections: DefaultDict[int, Set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, id_empresa: int) -> None:
        await websocket.accept()
        self.active_connections[id_empresa].add(websocket)
        logger.info(
            "WS conectado para empresa %s. Total conexiones: %s",
            id_empresa,
            len(self.active_connections[id_empresa]),
        )

    def disconnect(self, websocket: WebSocket, id_empresa: int) -> None:
        connections = self.active_connections.get(id_empresa)
        if not connections:
            return

        connections.discard(websocket)
        if not connections:
            self.active_connections.pop(id_empresa, None)

        logger.info("WS desconectado para empresa %s.", id_empresa)

    async def broadcast_to_company(self, id_empresa: int, message: dict) -> None:
        connections = self.active_connections.get(id_empresa)
        if not connections:
            return

        dead_connections: list[WebSocket] = []
        for websocket in list(connections):
            try:
                await websocket.send_json(message)
            except Exception:
                dead_connections.append(websocket)

        for websocket in dead_connections:
            self.disconnect(websocket, id_empresa)

    async def broadcast_to_empresa(self, id_empresa: int, message: dict) -> None:
        await self.broadcast_to_company(id_empresa, message)


manager = KitchenConnectionManager()
