"""
Router de Planos de Estudo.

Endpoints:
  POST /ai/plan          — gera um novo plano semanal otimizado
  GET  /ai/plan/history  — lista planos anteriores gerados pelo utilizador
"""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.schemas.plan_schemas import PlanGenerateResponse, PlanHistoryResponse
from app.services.plan_service import generate_study_plan, get_plan_history

router = APIRouter()


@router.post("/plan", response_model=PlanGenerateResponse)
async def generate_plan(user_id: str = Depends(get_current_user_id)):
    """
    Gera um plano de estudo semanal optimizado com base em:
    - Disciplinas registadas e os seus objetivos semanais
    - Sessões de estudo da semana actual (para calcular o défice)
    - Exames futuros (para calcular urgência)
    - Prioridade e dificuldade de cada disciplina

    O plano é persistido no Firestore (coleção 'studyPlans') e uma mensagem
    motivacional é gerada pela Groq/Llama API.
    """
    return await generate_study_plan(user_id)


@router.get("/plan/history", response_model=PlanHistoryResponse)
def plan_history(user_id: str = Depends(get_current_user_id)):
    """
    Devolve os últimos planos gerados pelo utilizador autenticado.
    Útil para o frontend mostrar planos anteriores.
    """
    return get_plan_history(user_id)
