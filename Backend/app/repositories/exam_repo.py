"""
Repositório de exames — único ponto de acesso ao Firestore
para a coleção 'exams'.
"""
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from google.cloud.firestore_v1.base_query import FieldFilter

from app.core.firebase import get_db
from app.models.exam import ExamModel

COLLECTION = "exams"


class ExamRepository:

    def get_by_id(self, exam_id: str) -> ExamModel | None:
        doc = get_db().collection(COLLECTION).document(exam_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return ExamModel.from_firestore_dict(data)

    def list_by_user(self, user_id: str) -> list[ExamModel]:
        docs = (
            get_db().collection(COLLECTION)
            .where(filter=FieldFilter("userId", "==", user_id))
            .order_by("data")
            .get()
        )
        result = []
        for d in docs:
            data = d.to_dict()
            data["id"] = d.id
            result.append(ExamModel.from_firestore_dict(data))
        return result

    def list_by_subject(self, user_id: str, subject_id: str) -> list[ExamModel]:
        docs = (
            get_db().collection(COLLECTION)
            .where(filter=FieldFilter("userId", "==", user_id))
            .where(filter=FieldFilter("subjectId", "==", subject_id))
            .order_by("data")
            .get()
        )
        result = []
        for d in docs:
            data = d.to_dict()
            data["id"] = d.id
            result.append(ExamModel.from_firestore_dict(data))
        return result

    def create(self, exam: ExamModel) -> None:
        data = exam.to_firestore_dict()
        data["createdAt"] = SERVER_TIMESTAMP
        get_db().collection(COLLECTION).document(exam.id).set(data)

    def update(self, exam_id: str, fields: dict) -> None:
        get_db().collection(COLLECTION).document(exam_id).update(fields)

    def delete(self, exam_id: str) -> None:
        get_db().collection(COLLECTION).document(exam_id).delete()


exam_repo = ExamRepository()
