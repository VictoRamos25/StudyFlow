"""
Repositório de planos de estudo — único ponto de acesso ao Firestore
para a coleção 'studyPlans'.
"""
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from google.cloud.firestore_v1.base_query import FieldFilter

from app.core.firebase import get_db
from app.models.plan import StudyPlanModel

COLLECTION = "studyPlans"


class PlanRepository:

    def get_by_id(self, plan_id: str) -> StudyPlanModel | None:
        doc = get_db().collection(COLLECTION).document(plan_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return StudyPlanModel.from_firestore_dict(data)

    def list_by_user(self, user_id: str, limit: int = 10) -> list[StudyPlanModel]:
        # Sem order_by para evitar índice composto no Firestore
        # A ordenação é feita em Python
        docs = (
            get_db().collection(COLLECTION)
            .where(filter=FieldFilter("userId", "==", user_id))
            .limit(limit)
            .get()
        )
        result = []
        for d in docs:
            data = d.to_dict()
            data["id"] = d.id
            result.append(StudyPlanModel.from_firestore_dict(data))

        # Ordenar por geradoEm DESC em Python
        result.sort(key=lambda p: p.geradoEm, reverse=True)
        return result

    def get_latest(self, user_id: str) -> StudyPlanModel | None:
        plans = self.list_by_user(user_id, limit=1)
        return plans[0] if plans else None

    def create(self, plan: StudyPlanModel) -> None:
        data = plan.to_firestore_dict()
        data["createdAt"] = SERVER_TIMESTAMP
        get_db().collection(COLLECTION).document(plan.id).set(data)

    def delete(self, plan_id: str) -> None:
        get_db().collection(COLLECTION).document(plan_id).delete()

    def delete_old_plans(self, user_id: str, keep: int = 5) -> None:
        """Mantém apenas os N planos mais recentes para não encher o Firestore."""
        plans = self.list_by_user(user_id, limit=50)
        for old in plans[keep:]:
            try:
                self.delete(old.id)
            except Exception:
                pass


plan_repo = PlanRepository()
