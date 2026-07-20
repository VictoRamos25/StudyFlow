from app.models.user import UserModel
from app.repositories.user_repo import user_repo
from app.utils.exceptions import NotFoundException

ALLOWED_UPDATE_FIELDS = {
    "nome", "curso", "anoAcademico", "fotoURL",
    "publicProfileEnabled", "pomodoroMinutes",
    "notificationsEnabled", "weeklyWrappedEnabled",
}


def get_user_by_id(uid: str) -> UserModel:
    user = user_repo.get_by_id(uid)
    if not user:
        raise NotFoundException("Utilizador não encontrado")
    return user


def update_user_profile(uid: str, fields: dict) -> None:
    filtered = {k: v for k, v in fields.items() if k in ALLOWED_UPDATE_FIELDS}
    if filtered:
        user_repo.update(uid, filtered)
