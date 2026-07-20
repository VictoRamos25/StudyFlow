"""
Schemas Pydantic para o serviço de planos de estudo.
Validação de entrada/saída dos endpoints.
"""
from pydantic import BaseModel
from typing import List, Optional


# ── Blocos e dias ─────────────────────────────────────────────────────────────

class PlanDayBlockSchema(BaseModel):
    disciplina: str
    subjectId: str
    cor: str
    horas: float
    descricao: str = ""


class PlanDaySchema(BaseModel):
    data: str           # "YYYY-MM-DD"
    diaSemana: str
    blocos: List[PlanDayBlockSchema]
    totalMinutos: int


# ── Plano completo ────────────────────────────────────────────────────────────

class StudyPlanSchema(BaseModel):
    semana: str
    geradoEm: str
    diasAteExame: Optional[int] = None
    proximoExame: Optional[str] = None
    dias: List[PlanDaySchema]
    totalHorasPlano: float
    mensagemIA: str


class PlanGenerateResponse(BaseModel):
    plan: StudyPlanSchema


class PlanHistoryItem(BaseModel):
    id: str
    semana: str
    geradoEm: str
    totalHorasPlano: float
    proximoExame: Optional[str] = None


class PlanHistoryResponse(BaseModel):
    plans: List[PlanHistoryItem]
    total: int
