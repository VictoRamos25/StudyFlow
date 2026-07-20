from fastapi import APIRouter, status

from app.schemas.auth import (
    RegisterRequest, LoginRequest,
    AuthResponse, UsernameCheckResponse,
)
from app.services.auth_service import (
    register_user, login_user, check_username_available,
)

router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    """
    Cria conta no Firebase Auth e escreve o perfil no Firestore.
    Devolve um custom token — o cliente deve trocá-lo por um ID token
    com signInWithCustomToken() do Firebase SDK.
    """
    return await register_user(payload)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    """Autentica via Firebase Auth REST API. Devolve o ID token."""
    return await login_user(payload)


@router.get("/check-username/{username}", response_model=UsernameCheckResponse)
async def check_username(username: str):
    """Verifica se um username está disponível (case-insensitive)."""
    available = await check_username_available(username.lower())
    return UsernameCheckResponse(username=username, available=available)
