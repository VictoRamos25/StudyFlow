from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from google.cloud.firestore_v1.base_query import FieldFilter
from app.core.firebase import get_db
from app.models.suggestion import SuggestionModel

COLLECTION = "aiSuggestions"


class SuggestionRepository:

    def list_by_user(self, user_id: str, apenas_nao_lidas: bool = False) -> list[SuggestionModel]:
        query = (
            get_db().collection(COLLECTION)
            .where(filter=FieldFilter("userId", "==", user_id))
        )
        if apenas_nao_lidas:
            query = query.where(filter=FieldFilter("lida", "==", False))
        docs = query.get()
        suggestions = []
        for d in docs:
            data = d.to_dict()
            data["id"] = d.id
            suggestions.append(SuggestionModel.from_firestore_dict(data))
        suggestions.sort(key=lambda s: s.createdAt or "", reverse=True)
        return suggestions

    def create(self, suggestion: SuggestionModel) -> None:
        data = suggestion.to_firestore_dict()
        data["createdAt"] = SERVER_TIMESTAMP
        get_db().collection(COLLECTION).document(suggestion.id).set(data)

    def mark_as_read(self, suggestion_id: str) -> None:
        get_db().collection(COLLECTION).document(suggestion_id).update({"lida": True})

    def delete_old(self, user_id: str) -> None:
        """Elimina sugestões lidas antigas para não acumular."""
        docs = (
            get_db().collection(COLLECTION)
            .where(filter=FieldFilter("userId", "==", user_id))
            .where(filter=FieldFilter("lida", "==", True))
            .get()
        )
        for d in docs:
            d.reference.delete()


suggestion_repo = SuggestionRepository()
