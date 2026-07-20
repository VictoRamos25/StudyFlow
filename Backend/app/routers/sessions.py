from fastapi import APIRouter, Depends, Query, status
from typing import Optional

from app.core.security import get_current_user_id
from app.schemas.session import (
    SessionCreateRequest, SessionUpdateRequest,
    SessionResponse, SessionListResponse, SessionStatsResponse,
)
from app.services.session_service import (
    list_sessions, create_session, get_session,
    update_session, delete_session, get_session_stats,
)

router = APIRouter()


@router.get("", response_model=SessionListResponse)
def list_all(
    subject_id: Optional[str] = Query(None, alias="subjectId"),
    data_inicio: Optional[str] = Query(None, alias="dataInicio"),
    data_fim: Optional[str] = Query(None, alias="dataFim"),
    user_id: str = Depends(get_current_user_id),
):
    """Lista sessões do utilizador. Suporta filtro por disciplina e intervalo de datas."""
    return list_sessions(user_id, subject_id, data_inicio, data_fim)


@router.get("/stats", response_model=SessionStatsResponse)
def stats(
    data_inicio: Optional[str] = Query(None, alias="dataInicio"),
    data_fim: Optional[str] = Query(None, alias="dataFim"),
    user_id: str = Depends(get_current_user_id),
):
    """Estatísticas agregadas das sessões do utilizador."""
    return get_session_stats(user_id, data_inicio, data_fim)


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create(payload: SessionCreateRequest, user_id: str = Depends(get_current_user_id)):
    """Regista uma nova sessão de estudo."""
    return create_session(user_id, payload)


@router.get("/{session_id}", response_model=SessionResponse)
def get_one(session_id: str, user_id: str = Depends(get_current_user_id)):
    """Devolve uma sessão pelo id."""
    return get_session(user_id, session_id)


@router.patch("/{session_id}", response_model=SessionResponse)
def update(
    session_id: str,
    payload: SessionUpdateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Atualiza campos de uma sessão."""
    return update_session(user_id, session_id, payload)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(session_id: str, user_id: str = Depends(get_current_user_id)):
    """Elimina uma sessão."""
    delete_session(user_id, session_id)
