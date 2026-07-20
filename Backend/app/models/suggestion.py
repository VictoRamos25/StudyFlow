from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class SuggestionModel:
    id: str
    userId: str
    mensagem: str
    tipo: str          # "spaced_repetition" | "desequilibrio" | "exame_proximo" | "pomodoro"
    subjectId: str = ""
    lida: bool = False
    createdAt: Optional[datetime] = None

    def to_firestore_dict(self) -> dict:
        return {
            "userId": self.userId,
            "mensagem": self.mensagem,
            "tipo": self.tipo,
            "subjectId": self.subjectId,
            "lida": self.lida,
        }

    @classmethod
    def from_firestore_dict(cls, data: dict) -> "SuggestionModel":
        return cls(
            id=data.get("id", ""),
            userId=data.get("userId", ""),
            mensagem=data.get("mensagem", ""),
            tipo=data.get("tipo", ""),
            subjectId=data.get("subjectId", ""),
            lida=data.get("lida", False),
            createdAt=data.get("createdAt"),
        )
