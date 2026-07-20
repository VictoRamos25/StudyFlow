from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class ChatHistoryModel:
    id: str
    userId: str
    role: str        # "user" | "model"
    content: str
    createdAt: Optional[datetime] = None

    def to_firestore_dict(self) -> dict:
        return {
            "userId": self.userId,
            "role": self.role,
            "content": self.content,
        }

    @classmethod
    def from_firestore_dict(cls, data: dict) -> "ChatHistoryModel":
        return cls(
            id=data.get("id", ""),
            userId=data.get("userId", ""),
            role=data.get("role", "user"),
            content=data.get("content", ""),
            createdAt=data.get("createdAt"),
        )
