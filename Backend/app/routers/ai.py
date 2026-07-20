"""
Router do Agente de IA — chat, histórico, sugestões proativas, dashboard e plano de estudo.
"""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.schemas.ai import (
    AIChatRequest, AIChatResponse,
    ChatHistoryResponse,
    SuggestionsListResponse,
    DashboardResponse,
)
from app.schemas.plan_schemas import PlanGenerateResponse, PlanHistoryResponse
from app.services.ai_service import (
    chat_with_agent,
    get_chat_history,
    generate_suggestions,
    get_suggestions,
    mark_suggestion_read,
)
from app.services.dashboard_service import get_dashboard
from app.services.plan_service import generate_study_plan, get_plan_history

router = APIRouter()


@router.post("/chat", response_model=AIChatResponse)
async def chat(payload: AIChatRequest, user_id: str = Depends(get_current_user_id)):
    return await chat_with_agent(user_id, payload)


@router.get("/chat/history", response_model=ChatHistoryResponse)
def chat_history(user_id: str = Depends(get_current_user_id)):
    return get_chat_history(user_id)


@router.post("/suggestions/generate", response_model=SuggestionsListResponse)
def generate(user_id: str = Depends(get_current_user_id)):
    return generate_suggestions(user_id)


@router.get("/suggestions", response_model=SuggestionsListResponse)
def list_suggestions(user_id: str = Depends(get_current_user_id)):
    return get_suggestions(user_id)


@router.patch("/suggestions/{suggestion_id}/read")
def read_suggestion(suggestion_id: str, user_id: str = Depends(get_current_user_id)):
    mark_suggestion_read(suggestion_id)
    return {"ok": True}


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(user_id: str = Depends(get_current_user_id)):
    return get_dashboard(user_id)


@router.post("/plan", response_model=PlanGenerateResponse)
async def generate_plan(user_id: str = Depends(get_current_user_id)):
    return await generate_study_plan(user_id)


@router.get("/plan/history", response_model=PlanHistoryResponse)
def plan_history(user_id: str = Depends(get_current_user_id)):
    return get_plan_history(user_id)
