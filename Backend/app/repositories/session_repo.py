from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from google.cloud.firestore_v1.base_query import FieldFilter
from app.core.firebase import get_db
from app.models.session import SessionModel

COLLECTION = "studySessions"


class SessionRepository:

    def get_by_id(self, session_id: str) -> SessionModel | None:
        doc = get_db().collection(COLLECTION).document(session_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return SessionModel.from_firestore_dict(data)

    def list_by_user(
        self,
        user_id: str,
        subject_id: str | None = None,
        data_inicio: str | None = None,
        data_fim: str | None = None,
    ) -> list[SessionModel]:
        query = (
            get_db().collection(COLLECTION)
            .where(filter=FieldFilter("userId", "==", user_id))
        )
        if subject_id:
            query = query.where(filter=FieldFilter("subjectId", "==", subject_id))
        if data_inicio:
            query = query.where(filter=FieldFilter("data", ">=", data_inicio))
        if data_fim:
            query = query.where(filter=FieldFilter("data", "<=", data_fim))

        docs = query.get()
        sessions = []
        for d in docs:
            data = d.to_dict()
            data["id"] = d.id
            sessions.append(SessionModel.from_firestore_dict(data))
        # Ordenar por data desc em Python (evita índice composto no Firestore)
        sessions.sort(key=lambda s: (s.data, s.id), reverse=True)
        return sessions

    def create(self, session: SessionModel) -> None:
        data = session.to_firestore_dict()
        data["createdAt"] = SERVER_TIMESTAMP
        get_db().collection(COLLECTION).document(session.id).set(data)

    def update(self, session_id: str, fields: dict) -> None:
        get_db().collection(COLLECTION).document(session_id).update(fields)

    def delete(self, session_id: str) -> None:
        get_db().collection(COLLECTION).document(session_id).delete()


session_repo = SessionRepository()
