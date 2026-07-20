"""
Serviço de autenticação — toda a lógica de negócio.
Orquestra Firebase Auth, repositório e schemas.

CORRECÇÃO CRÍTICA:
  O registo devolve agora um ID token real (via Firebase REST API signInWithPassword)
  em vez de um custom token. O custom token não pode ser verificado por verify_id_token()
  nas rotas protegidas — apenas os ID tokens são válidos para isso.
"""
import httpx
from firebase_admin import auth as firebase_auth

from app.core.config import settings
from app.core.firebase import get_auth
from app.models.user import UserModel
from app.repositories.user_repo import user_repo
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from app.services.notification_service import send_welcome_email
from app.utils.exceptions import BadRequestException, UnauthorizedException, ConflictException

FIREBASE_SIGN_IN_URL = (
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
)


async def _get_id_token(email: str, password: str) -> str:
    """
    Usa a Firebase REST API para fazer sign-in e obter um ID token real.
    Chamado imediatamente após o registo para devolver um token utilizável.
    """
    if not settings.FIREBASE_WEB_API_KEY:
        raise BadRequestException("FIREBASE_WEB_API_KEY não configurada no servidor")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            FIREBASE_SIGN_IN_URL,
            params={"key": settings.FIREBASE_WEB_API_KEY},
            json={
                "email": email,
                "password": password,
                "returnSecureToken": True,
            },
        )

    if resp.status_code != 200:
        raise BadRequestException("Não foi possível autenticar após o registo")

    return resp.json()["idToken"]


async def check_username_available(username: str) -> bool:
    return not user_repo.username_exists(username.lower())


async def register_user(data: RegisterRequest) -> AuthResponse:
    auth = get_auth()

    if user_repo.username_exists(data.username):
        raise ConflictException("Este username já está em uso")

    # 1. Criar utilizador no Firebase Auth
    try:
        user_record = auth.create_user(
            email=data.email,
            password=data.password,
            display_name=data.nome,
        )
    except firebase_auth.EmailAlreadyExistsError:
        raise ConflictException("Este email já está registado")
    except Exception as e:
        raise BadRequestException(f"Erro ao criar utilizador: {e}")

    uid = user_record.uid

    # 2. Persistir perfil no Firestore
    user = UserModel(
        id=uid,
        nome=data.nome,
        email=data.email,
        publicUsername=data.username,
        curso=data.curso or "",
    )
    try:
        user_repo.create(user)
    except Exception as e:
        # Rollback: eliminar utilizador do Firebase Auth se o Firestore falhar
        try:
            auth.delete_user(uid)
        except Exception:
            pass
        raise BadRequestException(f"Erro ao guardar perfil: {e}")

    # 3. Obter ID token real via REST API (em vez de custom token)
    #    O ID token é verificável por verify_id_token() nas rotas protegidas.
    id_token = await _get_id_token(data.email, data.password)

    # 4. Enviar email de boas-vindas (fire-and-forget — nunca bloqueia o registo)
    await send_welcome_email(email=data.email, nome=data.nome)

    return AuthResponse(
        uid=uid,
        email=data.email,
        nome=data.nome,
        username=data.username,
        token=id_token,
    )


async def login_user(data: LoginRequest) -> AuthResponse:
    if not settings.FIREBASE_WEB_API_KEY:
        raise BadRequestException("FIREBASE_WEB_API_KEY não configurada no servidor")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            FIREBASE_SIGN_IN_URL,
            params={"key": settings.FIREBASE_WEB_API_KEY},
            json={
                "email": data.email,
                "password": data.password,
                "returnSecureToken": True,
            },
        )

    if resp.status_code != 200:
        msg = resp.json().get("error", {}).get("message", "")
        if msg in ("EMAIL_NOT_FOUND", "INVALID_PASSWORD", "INVALID_LOGIN_CREDENTIALS"):
            raise UnauthorizedException("Email ou palavra-passe incorretos")
        if msg == "USER_DISABLED":
            raise UnauthorizedException("Esta conta foi desativada")
        raise UnauthorizedException("Erro de autenticação")

    resp_data = resp.json()
    uid = resp_data["localId"]
    id_token = resp_data["idToken"]

    user = user_repo.get_by_id(uid)
    if not user:
        raise UnauthorizedException("Perfil de utilizador não encontrado")

    return AuthResponse(
        uid=uid,
        email=data.email,
        nome=user.nome,
        username=user.publicUsername,
        token=id_token,
    )