from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class SubjectModel:
    id: str
    userId: str
    nome: str
    creditos: int = 0
    prioridade: str = "media"
    objetivoSemanalHoras: float = 0.0
    cor: str = "#7EB8F7"
    createdAt: Optional[datetime] = None

    def to_firestore_dict(self) -> dict:
        return {
            "userId": self.userId,
            "nome": self.nome,
            "creditos": self.creditos,
            "prioridade": self.prioridade,
            "objetivoSemanalHoras": self.objetivoSemanalHoras,
            "cor": self.cor,
            # createdAt é gerido pelo SERVER_TIMESTAMP no repo
        }

    @classmethod
    def from_firestore_dict(cls, data: dict) -> "SubjectModel":
        # Extrair o ID se ele vier dentro do dict, senão vazio
        sid = data.get("id", "")
        
        return cls(
            id=sid,
            userId=data.get("userId", ""),
            nome=data.get("nome", ""),
            creditos=data.get("creditos", 0),
            prioridade=data.get("prioridade", "media"),
            objetivoSemanalHoras=data.get("objetivoSemanalHoras", 0.0),
            cor=data.get("cor", "#7EB8F7"),
            createdAt=data.get("createdAt"),
        )