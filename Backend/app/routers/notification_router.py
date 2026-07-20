"""
Router de notificações.

Endpoint:
  POST /notifications/weekly-wrapped
    Gera e envia o Weekly Wrapped para o utilizador autenticado.
    Respeitada a flag weeklyWrappedEnabled do utilizador.
"""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.repositories.user_repo import user_repo
from app.services.dashboard_service import get_dashboard
from app.services.notification_service import send_weekly_wrapped
from app.schemas.notification import WeeklyWrappedResponse
from app.utils.exceptions import BadRequestException

router = APIRouter()


@router.post(
    "/weekly-wrapped",
    response_model=WeeklyWrappedResponse,
    summary="Enviar Weekly Wrapped",
    description=(
        "Gera o resumo semanal a partir dos dados actuais do dashboard e envia "
        "por email ao utilizador autenticado. Só funciona se `weeklyWrappedEnabled` "
        "estiver activo nas preferências do utilizador."
    ),
)
async def trigger_weekly_wrapped(
    uid: str = Depends(get_current_user),
) -> WeeklyWrappedResponse:
    user = user_repo.get_by_id(uid)
    if not user:
        raise BadRequestException("Utilizador não encontrado")

    if not user.weeklyWrappedEnabled:
        return WeeklyWrappedResponse(
            sent=False,
            message="Weekly Wrapped desactivado nas preferências do utilizador.",
        )

    # Reutiliza o mesmo agregador do dashboard
    dashboard = get_dashboard(uid)

    # Disciplina mais estudada na semana
    top_subject: str | None = None
    if dashboard.subjectStats:
        # subjectStats está ordenado por menor percentagem; invertemos para maior minutos
        top = max(dashboard.subjectStats, key=lambda s: s.minutosEstudados)
        if top.minutosEstudados > 0:
            top_subject = top.nome

    await send_weekly_wrapped(
        email=user.email,
        nome=user.nome,
        horas=dashboard.horasSemanais,
        sessoes=dashboard.totalSessoesSemanais,
        streak=dashboard.streak,
        media_foco=dashboard.mediaFocoSemanal,
        top_subject=top_subject,
        proximo_exame=dashboard.proximoExame,
    )

    return WeeklyWrappedResponse(
        sent=True,
        message=f"Weekly Wrapped enviado para {user.email}.",
    )
