from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "StudyFlow API"
    APP_VERSION: str = "1.0.0"
    GROQ_API_KEY: str = ""            # lido do .env — nunca hardcoded
    DEBUG: bool = False

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # ── Firebase ──────────────────────────────────────────────
    # Firebase Console → Definições do projeto → Geral → Chave de API da Web
    FIREBASE_WEB_API_KEY: str = ""
    # Firebase Console → Definições → Contas de serviço → Gerar nova chave privada
    FIREBASE_SERVICE_ACCOUNT_PATH: str = "serviceAccountKey.json"
    # Alternativa: conteúdo JSON inline (recomendado em produção/containers)
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""

    # ── Resend (emails transaccionais) ─────────────────────────
    # Resend dashboard → API Keys → Create API Key
    RESEND_API_KEY: str = ""
    # Endereço remetente verificado no Resend (ex: "StudyFlow <noreply@tuaapp.com>")
    RESEND_FROM_EMAIL: str = "StudyFlow <noreply@studyflow.app>"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
