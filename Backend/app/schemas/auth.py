from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    nome: str
    username: str
    curso: Optional[str] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip().lower()
        if len(v) < 3:
            raise ValueError("O username deve ter pelo menos 3 caracteres")
        if len(v) > 30:
            raise ValueError("O username não pode ter mais de 30 caracteres")
        if not re.match(r"^[a-z0-9_]+$", v):
            raise ValueError("O username só pode conter letras minúsculas, números e _")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("A palavra-passe deve ter pelo menos 8 caracteres")
        return v

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("O nome não pode estar vazio")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    uid: str
    email: str
    nome: str
    username: str
    token: str


class UsernameCheckResponse(BaseModel):
    username: str
    available: bool
