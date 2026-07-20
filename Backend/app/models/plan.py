"""
Modelo de domínio de Planos de Estudo — espelha a coleção 'studyPlans' no Firestore.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class PlanBlockModel:
    """Um bloco de estudo dentro de um dia do plano."""
    disciplina: str
    subjectId: str
    cor: str
    horas: float          # horas decimais  ex: 1.5 = 1h30m
    descricao: str = ""


@dataclass
class PlanDayModel:
    """Um dia dentro do plano semanal."""
    data: str             # "YYYY-MM-DD"
    diaSemana: str        # "Segunda-feira", "Terça-feira", ...
    blocos: list[PlanBlockModel] = field(default_factory=list)

    @property
    def totalMinutos(self) -> int:
        return round(sum(b.horas * 60 for b in self.blocos))


@dataclass
class StudyPlanModel:
    """Plano de estudo semanal gerado pela IA."""
    id: str
    userId: str
    semana: str                        # "2026-W20"
    geradoEm: str                      # ISO timestamp
    diasAteExame: Optional[int]
    proximoExame: Optional[str]
    dias: list[PlanDayModel] = field(default_factory=list)
    totalHorasPlano: float = 0.0
    mensagemIA: str = ""
    createdAt: Optional[datetime] = None

    def to_firestore_dict(self) -> dict:
        return {
            "userId": self.userId,
            "semana": self.semana,
            "geradoEm": self.geradoEm,
            "diasAteExame": self.diasAteExame,
            "proximoExame": self.proximoExame,
            "totalHorasPlano": self.totalHorasPlano,
            "mensagemIA": self.mensagemIA,
            "dias": [
                {
                    "data": d.data,
                    "diaSemana": d.diaSemana,
                    "totalMinutos": d.totalMinutos,
                    "blocos": [
                        {
                            "disciplina": b.disciplina,
                            "subjectId": b.subjectId,
                            "cor": b.cor,
                            "horas": b.horas,
                            "descricao": b.descricao,
                        }
                        for b in d.blocos
                    ],
                }
                for d in self.dias
            ],
        }

    @classmethod
    def from_firestore_dict(cls, data: dict) -> "StudyPlanModel":
        dias = []
        for d in data.get("dias", []):
            blocos = [
                PlanBlockModel(
                    disciplina=b.get("disciplina", ""),
                    subjectId=b.get("subjectId", ""),
                    cor=b.get("cor", "#7EB8F7"),
                    horas=b.get("horas", 0.0),
                    descricao=b.get("descricao", ""),
                )
                for b in d.get("blocos", [])
            ]
            dias.append(PlanDayModel(
                data=d.get("data", ""),
                diaSemana=d.get("diaSemana", ""),
                blocos=blocos,
            ))
        return cls(
            id=data.get("id", ""),
            userId=data.get("userId", ""),
            semana=data.get("semana", ""),
            geradoEm=data.get("geradoEm", ""),
            diasAteExame=data.get("diasAteExame"),
            proximoExame=data.get("proximoExame"),
            dias=dias,
            totalHorasPlano=data.get("totalHorasPlano", 0.0),
            mensagemIA=data.get("mensagemIA", ""),
            createdAt=data.get("createdAt"),
        )
