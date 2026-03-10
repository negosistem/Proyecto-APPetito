"""
WebSocket Connection Manager para el módulo de Cocina.
Agrupa conexiones por id_empresa para garantizar aislamiento multi-tenant:
solo se notifica al restaurante correcto cuando cambia una orden.
"""

from fastapi import WebSocket
from typing import Dict, List
import json
import logging

logger = logging.getLogger(__name__)


class KitchenConnectionManager:
    """
    Gestiona las conexiones WebSocket activas agrupadas por id_empresa.
    Permite broadcasting selectivo: cuando cambia una orden de la empresa X,
    solo reciben la notificación las conexiones de esa empresa.
    """

    def __init__(self):
        # { id_empresa: [websocket1, websocket2, ...] }
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, id_empresa: int):
        """Acepta la conexión y la registra en el grupo de la empresa."""
        await websocket.accept()
        if id_empresa not in self.active_connections:
            self.active_connections[id_empresa] = []
        self.active_connections[id_empresa].append(websocket)
        logger.info(f"WS conectado para empresa {id_empresa}. "
                    f"Total conexiones: {len(self.active_connections[id_empresa])}")

    def disconnect(self, websocket: WebSocket, id_empresa: int):
        """Elimina la conexión del grupo de la empresa al desconectarse."""
        if id_empresa in self.active_connections:
            try:
                self.active_connections[id_empresa].remove(websocket)
            except ValueError:
                pass
            # Limpiar clave vacía
            if not self.active_connections[id_empresa]:
                del self.active_connections[id_empresa]
        logger.info(f"WS desconectado para empresa {id_empresa}.")

    async def broadcast_to_empresa(self, id_empresa: int, message: dict):
        """
        Envía un mensaje JSON a TODAS las conexiones activas de una empresa.
        Si alguna conexión falla, la elimina silenciosamente.
        """
        if id_empresa not in self.active_connections:
            return  # Nadie escuchando, no pasa nada

        dead_connections = []
        for websocket in self.active_connections[id_empresa]:
            try:
                await websocket.send_json(message)
            except Exception:
                dead_connections.append(websocket)

        # Limpiar conexiones muertas
        for ws in dead_connections:
            self.disconnect(ws, id_empresa)


# Instancia global — se importa desde router.py
manager = KitchenConnectionManager()
