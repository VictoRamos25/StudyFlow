"""
Modelo de domínio de sessões de estudo — espelha a coleção 'studySessions' no Firestore.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class SessionModel:
    id: str
    userId: str
    subjectId: str
    data: str                    # ISO date string "YYYY-MM-DD"
    duracaoMinutos: int
    foco: int                    # 1-5
    humor: Optional[int] = None  # 1-5, opcional
    notas: str = ""
    tipo: str = "manual"         # "manual" | "pomodoro"
    groupId: Optional[str] = None
    createdAt: Optional[datetime] = None

    def to_firestore_dict(self) -> dict:
        return {
            "userId": self.userId,
            "subjectId": self.subjectId,
            "data": self.data,
            "duracaoMinutos": self.duracaoMinutos,
            "foco": self.foco,
            "humor": self.humor,
            "notas": self.notas,
            "tipo": self.tipo,
            "groupId": self.groupId,
        }

    @classmethod
    def from_firestore_dict(cls, data: dict) -> "SessionModel":
        return cls(
            id=data.get("id", ""),
            userId=data.get("userId", ""),
            subjectId=data.get("subjectId", ""),
            data=data.get("data", ""),
            duracaoMinutos=data.get("duracaoMinutos", 0),
            foco=data.get("foco", 3),
            humor=data.get("humor"),
            notas=data.get("notas", ""),
            tipo=data.get("tipo", "manual"),
            groupId=data.get("groupId"),
            createdAt=data.get("createdAt"),
        )
