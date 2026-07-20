"""
Modelo de domínio de Exames — espelha a coleção 'exams' no Firestore.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class ExamModel:
    id: str
    userId: str
    subjectId: str
    titulo: str
    data: str                          # ISO date "YYYY-MM-DD"
    dificuldadeEsperada: int           # 1-5
    local: str = ""
    notas: str = ""
    notaObtida: Optional[float] = None # preenchido após o exame
    createdAt: Optional[datetime] = None

    def to_firestore_dict(self) -> dict:
        return {
            "userId": self.userId,
            "subjectId": self.subjectId,
            "titulo": self.titulo,
            "data": self.data,
            "dificuldadeEsperada": self.dificuldadeEsperada,
            "local": self.local,
            "notas": self.notas,
            "notaObtida": self.notaObtida,
        }

    @classmethod
    def from_firestore_dict(cls, data: dict) -> "ExamModel":
        return cls(
            id=data.get("id", ""),
            userId=data.get("userId", ""),
            subjectId=data.get("subjectId", ""),
            titulo=data.get("titulo", ""),
            data=data.get("data", ""),
            dificuldadeEsperada=data.get("dificuldadeEsperada", 3),
            local=data.get("local", ""),
            notas=data.get("notas", ""),
            notaObtida=data.get("notaObtida"),
            createdAt=data.get("createdAt"),
        )