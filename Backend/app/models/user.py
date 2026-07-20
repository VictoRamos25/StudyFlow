"""
Modelo de domínio do utilizador — espelha a coleção 'users' no Firestore
e a tabela 'users' do diagrama ER.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class UserModel:
    id: str
    nome: str
    email: str
    publicUsername: str
    curso: str = ""
    anoAcademico: Optional[int] = None
    fotoURL: str = ""
    publicProfileEnabled: bool = False
    pomodoroMinutes: int = 25
    notificationsEnabled: bool = True
    weeklyWrappedEnabled: bool = True
    createdAt: Optional[datetime] = None

    def to_firestore_dict(self) -> dict:
        return {
            "id": self.id,
            "nome": self.nome,
            "email": self.email,
            "publicUsername": self.publicUsername,
            "curso": self.curso,
            "anoAcademico": self.anoAcademico,
            "fotoURL": self.fotoURL,
            "publicProfileEnabled": self.publicProfileEnabled,
            "pomodoroMinutes": self.pomodoroMinutes,
            "notificationsEnabled": self.notificationsEnabled,
            "weeklyWrappedEnabled": self.weeklyWrappedEnabled,
            # createdAt é definido via SERVER_TIMESTAMP no repositório
        }

    @classmethod
    def from_firestore_dict(cls, data: dict) -> "UserModel":
        return cls(
            id=data.get("id", ""),
            nome=data.get("nome", ""),
            email=data.get("email", ""),
            publicUsername=data.get("publicUsername", ""),
            curso=data.get("curso", ""),
            anoAcademico=data.get("anoAcademico"),
            fotoURL=data.get("fotoURL", ""),
            publicProfileEnabled=data.get("publicProfileEnabled", False),
            pomodoroMinutes=data.get("pomodoroMinutes", 25),
            notificationsEnabled=data.get("notificationsEnabled", True),
            weeklyWrappedEnabled=data.get("weeklyWrappedEnabled", True),
            createdAt=data.get("createdAt"),
        )
