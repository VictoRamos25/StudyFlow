"""
Router do Agente de IA — chat, histórico, sugestões proativas e dashboard.
"""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.schemas.ai import (
    AIChatRequest, AIChatResponse,
    ChatHistoryResponse,
    SuggestionsListResponse,
    DashboardResponse,
)
from app.services.ai_service import (
    chat_with_agent,
    get_chat_history,
    generate_suggestions,
    get_suggestions,
    mark_suggestion_read,
)
from app.services.dashboard_service import get_dashboard

router = APIRouter()


@router.post("/chat", response_model=AIChatResponse)
async def chat(payload: AIChatRequest, user_id: str = Depends(get_current_user_id)):
    """
    Envia uma mensagem ao agente de IA Groq.
    O agente recebe contexto completo (disciplinas, sessões, exames) em cada pedido.
    A conversa é guardada no Firestore (coleção aiChatHistory).
    """
    return await chat_with_agent(user_id, payload)


@router.get("/chat/history", response_model=ChatHistoryResponse)
def chat_history(user_id: str = Depends(get_current_user_id)):
    """
    Devolve o histórico de conversas persistido no Firestore para o utilizador autenticado.
    Permite retomar conversas entre sessões.
    """
    return get_chat_history(user_id)


@router.post("/suggestions/generate", response_model=SuggestionsListResponse)
def generate(user_id: str = Depends(get_current_user_id)):
    """
    Gera sugestões proativas com base nos dados do utilizador e devolve-as.
    Regras aplicadas:
      - Spaced Repetition: disciplina não estudada há ≥7 dias
      - Desequilíbrio semanal: disciplina com <20% do objetivo semanal
      - Exame próximo: exame a ≤7 dias com estudo insuficiente
      - Pomodoro: sessões longas (>90min) com foco <3 recorrentes
    """
    return generate_suggestions(user_id)


@router.get("/suggestions", response_model=SuggestionsListResponse)
def list_suggestions(user_id: str = Depends(get_current_user_id)):
    """Lista todas as sugestões do utilizador (lidas e não lidas)."""
    return get_suggestions(user_id)


@router.patch("/suggestions/{suggestion_id}/read")
def read_suggestion(suggestion_id: str, user_id: str = Depends(get_current_user_id)):
    """Marca uma sugestão como lida."""
    mark_suggestion_read(suggestion_id)
    return {"ok": True}


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(user_id: str = Depends(get_current_user_id)):
    """
    Devolve todos os dados do dashboard num único pedido:
    horas semanais, streak, foco médio, progresso por disciplina,
    próximo exame e número de sugestões não lidas.
    """
    return get_dashboard(user_id)
