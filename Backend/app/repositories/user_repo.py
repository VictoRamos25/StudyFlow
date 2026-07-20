"""
Repositório de utilizadores — único ponto de acesso ao Firestore
para a coleção 'users'. Nenhuma outra camada escreve/lê diretamente.
"""
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

from app.core.firebase import get_db
from app.models.user import UserModel

COLLECTION = "users"


class UserRepository:

    def get_by_id(self, uid: str) -> UserModel | None:
        doc = get_db().collection(COLLECTION).document(uid).get()
        if not doc.exists:
            return None
        return UserModel.from_firestore_dict(doc.to_dict())

    def get_by_username(self, username: str) -> UserModel | None:
        docs = (
            get_db().collection(COLLECTION)
            .where("publicUsername", "==", username.lower())
            .limit(1)
            .get()
        )
        if not docs:
            return None
        return UserModel.from_firestore_dict(docs[0].to_dict())

    def username_exists(self, username: str) -> bool:
        return self.get_by_username(username) is not None

    def create(self, user: UserModel) -> None:
        data = user.to_firestore_dict()
        data["createdAt"] = SERVER_TIMESTAMP
        get_db().collection(COLLECTION).document(user.id).set(data)

    def update(self, uid: str, fields: dict) -> None:
        get_db().collection(COLLECTION).document(uid).update(fields)

    def delete(self, uid: str) -> None:
        get_db().collection(COLLECTION).document(uid).delete()


user_repo = UserRepository()
