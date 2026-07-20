"""
Dependência FastAPI para rotas protegidas.
Uso: current_user: dict = Depends(get_current_user)
      user_id: str    = Depends(get_current_user_id)
"""
import logging
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin.exceptions import FirebaseError

from app.core.firebase import get_auth
from app.utils.exceptions import UnauthorizedException

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    token = credentials.credentials
    try:
        # check_revoked=False evita problemas de clock skew e latência de rede
        decoded = get_auth().verify_id_token(token, check_revoked=False)
        return decoded
    except FirebaseError as e:
        # Mostra o erro exacto no terminal do uvicorn para diagnóstico
        logger.error(f"[AUTH] FirebaseError: {type(e).__name__} — {e}")
        raise UnauthorizedException(f"Token inválido: {type(e).__name__}")
    except Exception as e:
        logger.error(f"[AUTH] Erro inesperado: {type(e).__name__} — {e}")
        raise UnauthorizedException("Não foi possível verificar o token")


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    user = await get_current_user(credentials)
    return user["uid"]
