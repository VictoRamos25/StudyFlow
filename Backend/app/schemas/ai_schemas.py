from pydantic import BaseModel
from typing import List, Optional


class ChatMessage(BaseModel):
    role: str        # "user" | "model"
    content: str


class AIChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class AIChatResponse(BaseModel):
    reply: str


# ── Histórico persistido ────────────────────────────────────
class ChatHistoryItem(BaseModel):
    id: str
    role: str
    content: str
    createdAt: Optional[str] = None


class ChatHistoryResponse(BaseModel):
    messages: List[ChatHistoryItem]
    total: int


# ── Sugestões proativas ─────────────────────────────────────
class SuggestionResponse(BaseModel):
    id: str
    userId: str
    mensagem: str
    tipo: str
    subjectId: str
    lida: bool


class SuggestionsListResponse(BaseModel):
    suggestions: List[SuggestionResponse]
    total: int


# ── Dashboard ───────────────────────────────────────────────
class SubjectStat(BaseModel):
    subjectId: str
    nome: str
    cor: str
    minutosEstudados: int
    objetivoMinutos: int
    percentagem: int


class DashboardResponse(BaseModel):
    horasSemanais: float
    totalSessoesSemanais: int
    mediaFocoSemanal: float
    streak: int
    totalSessoes: int
    totalHoras: float
    subjectStats: List[SubjectStat]
    proximoExame: Optional[dict] = None
    sugestoesNaoLidas: int
