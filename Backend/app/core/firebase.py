"""
Inicialização do Firebase Admin SDK — singleton.
Substitui o ficheiro app/core/firebase_config.py existente.
"""
import json
import os

import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth

from app.core.config import settings

_initialized = False


def _initialize():
    global _initialized
    if _initialized:
        return

    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        cred = credentials.Certificate(json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON))
    elif os.path.exists(settings.FIREBASE_SERVICE_ACCOUNT_PATH):
        cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
    else:
        raise RuntimeError(
            "Credenciais Firebase não encontradas.\n"
            "Define FIREBASE_SERVICE_ACCOUNT_PATH ou FIREBASE_SERVICE_ACCOUNT_JSON no .env"
        )

    firebase_admin.initialize_app(cred)
    _initialized = True


def get_db():
    _initialize()
    return firestore.client()


def get_auth():
    _initialize()
    return firebase_auth
