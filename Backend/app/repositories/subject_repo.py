from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from google.cloud.firestore_v1.base_query import FieldFilter
from app.core.firebase import get_db
from app.models.subject import SubjectModel

COLLECTION = "subjects"


class SubjectRepository:

    def get_by_id(self, subject_id: str) -> SubjectModel | None:
        doc = get_db().collection(COLLECTION).document(subject_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return SubjectModel.from_firestore_dict(data)

    def list_by_user(self, user_id: str) -> list[SubjectModel]:
        docs = (
            get_db().collection(COLLECTION)
            .where(filter=FieldFilter("userId", "==", user_id))
            .get()
        )
        subjects = []
        for d in docs:
            data = d.to_dict()
            data["id"] = d.id
            subjects.append(SubjectModel.from_firestore_dict(data))
        return subjects

    def get_by_username(self, username: str) -> SubjectModel | None:
        docs = (
            get_db().collection(COLLECTION)
            .where(filter=FieldFilter("publicUsername", "==", username.lower()))
            .limit(1)
            .get()
        )
        if not docs:
            return None
        data = docs[0].to_dict()
        data["id"] = docs[0].id
        return SubjectModel.from_firestore_dict(data)

    def create(self, subject: SubjectModel) -> None:
        data = subject.to_firestore_dict()
        data["createdAt"] = SERVER_TIMESTAMP
        get_db().collection(COLLECTION).document(subject.id).set(data)

    def update(self, subject_id: str, fields: dict) -> None:
        get_db().collection(COLLECTION).document(subject_id).update(fields)

    def delete(self, subject_id: str) -> None:
        get_db().collection(COLLECTION).document(subject_id).delete()


subject_repo = SubjectRepository()
