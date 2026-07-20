"""
Serviço de sessões de estudo — toda a lógica de negócio.
"""
import uuid
from typing import Optional

from app.models.session import SessionModel
from app.repositories.session_repo import session_repo
from app.schemas.session import (
    SessionCreateRequest, SessionUpdateRequest,
    SessionResponse, SessionListResponse, SessionStatsResponse,
)
from app.utils.exceptions import NotFoundException, BadRequestException


def _to_response(s: SessionModel) -> SessionResponse:
    return SessionResponse(
        id=s.id,
        userId=s.userId,
        subjectId=s.subjectId,
        data=s.data,
        duracaoMinutos=s.duracaoMinutos,
        foco=s.foco,
        humor=s.humor,
        notas=s.notas,
        tipo=s.tipo,
    )


def list_sessions(
    user_id: str,
    subject_id: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
) -> SessionListResponse:
    sessions = session_repo.list_by_user(user_id, subject_id, data_inicio, data_fim)
    return SessionListResponse(
        sessions=[_to_response(s) for s in sessions],
        total=len(sessions),
    )


def get_session_stats(
    user_id: str,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
) -> SessionStatsResponse:
    sessions = session_repo.list_by_user(user_id, data_inicio=data_inicio, data_fim=data_fim)

    if not sessions:
        return SessionStatsResponse(
            totalSessoes=0,
            totalMinutos=0,
            totalHoras=0.0,
            mediaFoco=0.0,
            mediaHumor=None,
            minutosPorDisciplina={},
        )

    total_minutos = sum(s.duracaoMinutos for s in sessions)
    media_foco = sum(s.foco for s in sessions) / len(sessions)

    humores = [s.humor for s in sessions if s.humor is not None]
    media_humor = sum(humores) / len(humores) if humores else None

    minutos_por_disc: dict[str, int] = {}
    for s in sessions:
        minutos_por_disc[s.subjectId] = minutos_por_disc.get(s.subjectId, 0) + s.duracaoMinutos

    return SessionStatsResponse(
        totalSessoes=len(sessions),
        totalMinutos=total_minutos,
        totalHoras=round(total_minutos / 60, 2),
        mediaFoco=round(media_foco, 2),
        mediaHumor=round(media_humor, 2) if media_humor is not None else None,
        minutosPorDisciplina=minutos_por_disc,
    )


def create_session(user_id: str, data: SessionCreateRequest) -> SessionResponse:
    session = SessionModel(
        id=str(uuid.uuid4()),
        userId=user_id,
        subjectId=data.subjectId,
        data=data.data,
        duracaoMinutos=data.duracaoMinutos,
        foco=data.foco,
        humor=data.humor,
        notas=data.notas.strip(),
        tipo=data.tipo,
    )
    session_repo.create(session)
    return _to_response(session)


def get_session(user_id: str, session_id: str) -> SessionResponse:
    session = session_repo.get_by_id(session_id)
    if not session or session.userId != user_id:
        raise NotFoundException("Sessão não encontrada")
    return _to_response(session)


def update_session(user_id: str, session_id: str, data: SessionUpdateRequest) -> SessionResponse:
    session = session_repo.get_by_id(session_id)
    if not session or session.userId != user_id:
        raise NotFoundException("Sessão não encontrada")

    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not fields:
        raise BadRequestException("Nenhum campo para atualizar")

    if "notas" in fields:
        fields["notas"] = fields["notas"].strip()

    session_repo.update(session_id, fields)
    updated = session_repo.get_by_id(session_id)
    return _to_response(updated)


def delete_session(user_id: str, session_id: str) -> None:
    session = session_repo.get_by_id(session_id)
    if not session or session.userId != user_id:
        raise NotFoundException("Sessão não encontrada")
    session_repo.delete(session_id)
