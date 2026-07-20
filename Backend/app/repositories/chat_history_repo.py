from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from google.cloud.firestore_v1.base_query import FieldFilter
from app.core.firebase import get_db
from app.models.chat_history import ChatHistoryModel

COLLECTION = "aiChatHistory"


class ChatHistoryRepository:

    def list_by_user(self, user_id: str, limit: int = 100) -> list[ChatHistoryModel]:
        docs = (
            get_db().collection(COLLECTION)
            .where(filter=FieldFilter("userId", "==", user_id))
            .get()
        )
        messages = []
        for d in docs:
            data = d.to_dict()
            data["id"] = d.id
            messages.append(ChatHistoryModel.from_firestore_dict(data))
        # ordenar por createdAt em Python (evita índice composto)
        messages.sort(key=lambda m: m.createdAt or "", reverse=False)
        return messages[-limit:]

    def add_message(self, message: ChatHistoryModel) -> None:
        data = message.to_firestore_dict()
        data["createdAt"] = SERVER_TIMESTAMP
        get_db().collection(COLLECTION).document(message.id).set(data)

    def clear_history(self, user_id: str) -> None:
        docs = (
            get_db().collection(COLLECTION)
            .where(filter=FieldFilter("userId", "==", user_id))
            .get()
        )
        for d in docs:
            d.reference.delete()


chat_history_repo = ChatHistoryRepository()
