"""
Serviço de dashboard — agrega dados de sessões, disciplinas, exames
e sugestões num único endpoint para o frontend e para demonstração no Swagger.
"""
from datetime import date, timedelta

from app.repositories.session_repo import session_repo
from app.repositories.subject_repo import subject_repo
from app.repositories.exam_repo import exam_repo
from app.repositories.suggestion_repo import suggestion_repo
from app.schemas.ai import DashboardResponse, SubjectStat


def get_dashboard(user_id: str) -> DashboardResponse:
    today     = date.today()
    today_str = today.isoformat()

    subjects = subject_repo.list_by_user(user_id)
    sessions = session_repo.list_by_user(user_id)
    exams    = exam_repo.list_by_user(user_id)

    # ── Semana actual (segunda → domingo) ────────────────────────────────────
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    week_end   = (today + timedelta(days=6 - today.weekday())).isoformat()

    week_sessions = [s for s in sessions if week_start <= s.data <= week_end]

    total_min_week   = sum(s.duracaoMinutos for s in week_sessions)
    total_sess_week  = len(week_sessions)
    media_foco_week  = (
        round(sum(s.foco for s in week_sessions) / total_sess_week, 2)
        if total_sess_week else 0.0
    )

    # ── Streak ───────────────────────────────────────────────────────────────
    days_with_study = {s.data for s in sessions}
    streak = 0
    for i in range(365):
        d = (today - timedelta(days=i)).isoformat()
        if d in days_with_study:
            streak += 1
        elif i > 0:
            break

    # ── Totais globais ────────────────────────────────────────────────────────
    total_min_all = sum(s.duracaoMinutos for s in sessions)

    # ── Stats por disciplina (semana) ─────────────────────────────────────────
    sub_map      = {s.id: s for s in subjects}
    week_min_sub: dict[str, int] = {}
    for s in week_sessions:
        week_min_sub[s.subjectId] = week_min_sub.get(s.subjectId, 0) + s.duracaoMinutos

    subject_stats = []
    for subj in subjects:
        goal_min = int(subj.objetivoSemanalHoras * 60)
        studied  = week_min_sub.get(subj.id, 0)
        pct      = min(100, round(studied / goal_min * 100)) if goal_min > 0 else 0
        subject_stats.append(SubjectStat(
            subjectId=subj.id,
            nome=subj.nome,
            cor=subj.cor,
            minutosEstudados=studied,
            objetivoMinutos=goal_min,
            percentagem=pct,
        ))

    # Ordenar: menor percentagem primeiro (mais negligenciadas)
    subject_stats.sort(key=lambda x: x.percentagem)

    # ── Próximo exame ─────────────────────────────────────────────────────────
    upcoming = sorted(
        [e for e in exams if e.data >= today_str],
        key=lambda e: e.data,
    )
    proximo_exame = None
    if upcoming:
        e    = upcoming[0]
        subj = sub_map.get(e.subjectId)
        proximo_exame = {
            "id": e.id,
            "titulo": e.titulo,
            "data": e.data,
            "subjectId": e.subjectId,
            "subjectNome": subj.nome if subj else "",
            "dificuldadeEsperada": e.dificuldadeEsperada,
            "diasRestantes": (date.fromisoformat(e.data) - today).days,
        }

    # ── Sugestões não lidas ───────────────────────────────────────────────────
    try:
        nao_lidas = len(suggestion_repo.list_by_user(user_id, apenas_nao_lidas=True))
    except Exception:
        nao_lidas = 0

    return DashboardResponse(
        horasSemanais=round(total_min_week / 60, 2),
        totalSessoesSemanais=total_sess_week,
        mediaFocoSemanal=media_foco_week,
        streak=streak,
        totalSessoes=len(sessions),
        totalHoras=round(total_min_all / 60, 2),
        subjectStats=subject_stats,
        proximoExame=proximo_exame,
        sugestoesNaoLidas=nao_lidas,
    )
