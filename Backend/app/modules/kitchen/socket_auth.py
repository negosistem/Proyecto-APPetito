from dataclasses import dataclass
from typing import Optional

from fastapi import WebSocket
from jose import JWTError, jwt
from sqlalchemy.orm import joinedload

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.user import User

settings = get_settings()


@dataclass(frozen=True)
class WebSocketIdentity:
    user_id: int
    company_id: int


def _extract_token(websocket: WebSocket) -> Optional[str]:
    auth_header = websocket.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()

    token = websocket.query_params.get("token")
    return token.strip() if token else None


async def authenticate_websocket(
    websocket: WebSocket,
    company_id: int,
) -> Optional[WebSocketIdentity]:
    token = _extract_token(websocket)
    if not token:
        await websocket.close(code=4401, reason="Token requerido")
        return None

    db = SessionLocal()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        token_company_id = payload.get("company_id")

        if not email:
            raise JWTError("Missing subject")

        user = (
            db.query(User)
            .options(joinedload(User.empresa))
            .filter(User.email == email)
            .first()
        )
        if not user or not user.is_active:
            await websocket.close(code=4403, reason="Usuario no autorizado")
            return None

        if user.id_empresa is None:
            await websocket.close(code=4403, reason="Usuario sin empresa")
            return None

        if token_company_id is not None and int(token_company_id) != company_id:
            await websocket.close(code=4403, reason="Empresa no autorizada")
            return None

        if user.id_empresa != company_id:
            await websocket.close(code=4403, reason="Empresa no autorizada")
            return None

        if user.empresa and not user.empresa.is_active:
            await websocket.close(code=4403, reason="Empresa suspendida")
            return None

        return WebSocketIdentity(user_id=user.id, company_id=user.id_empresa)
    except JWTError:
        await websocket.close(code=4401, reason="Token invalido")
        return None
    finally:
        db.close()
