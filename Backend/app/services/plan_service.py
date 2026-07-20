"""
Serviço de geração de planos de estudo otimizados.

Algoritmo:
1. Recolhe disciplinas, sessões e exames do utilizador no Firestore.
2. Calcula, para cada disciplina:
   - Horas estudadas esta semana
   - Distância ao próximo exame
   - Score de prioridade (urgência × dificuldade × débito)
3. Distribui as horas pelos dias da semana actual (Seg→Dom),
   respeitando um máximo diário configurável.
4. Chama a Groq API para gerar uma mensagem motivacional personalizada.
5. Persiste o plano no Firestore e devolve o schema completo.
"""
import uuid
import httpx
import logging
from datetime import date, timedelta

from app.core.config import settings
from app.repositories.subject_repo import subject_repo
from app.repositories.session_repo import session_repo
from app.repositories.exam_repo import exam_repo
from app.repositories.plan_repo import plan_repo
from app.models.plan import StudyPlanModel, PlanDayModel, PlanBlockModel
from app.schemas.plan_schemas import (
    PlanGenerateResponse,
    PlanHistoryResponse,
    PlanHistoryItem,
    StudyPlanSchema,
    PlanDaySchema,
    PlanDayBlockSchema,
)
from app.utils.exceptions import StudyFlowException

logger = logging.getLogger(__name__)

# ── Constantes ────────────────────────────────────────────────────────────────
GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"    # modelo gratuito e rápido

DIAS_SEMANA_PT = [
    "Segunda-feira", "Terça-feira", "Quarta-feira",
    "Quinta-feira", "Sexta-feira", "Sábado", "Domingo",
]

MAX_HORAS_DIA   = 4.0   # máximo de horas de estudo por dia
MIN_BLOCO_HORAS = 0.5   # mínimo de horas por bloco (30 min)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _week_bounds(today: date) -> tuple[date, date]:
    start = today - timedelta(days=today.weekday())
    return start, start + timedelta(days=6)


def _iso_week(today: date) -> str:
    return today.strftime("%G-W%V")


def _days_of_week(today: date) -> list[date]:
    monday = today - timedelta(days=today.weekday())
    return [monday + timedelta(days=i) for i in range(7)]


def _round_to_half(value: float) -> float:
    return round(value * 2) / 2


# ── Cálculo de prioridades ────────────────────────────────────────────────────

def _compute_priority_scores(user_id: str, today: date) -> list[dict]:
    subjects  = subject_repo.list_by_user(user_id)
    sessions  = session_repo.list_by_user(user_id)
    exams     = exam_repo.list_by_user(user_id)
    today_str = today.isoformat()

    week_start, _ = _week_bounds(today)
    week_start_str = week_start.isoformat()

    week_min: dict[str, int] = {}
    for s in sessions:
        if s.data >= week_start_str:
            week_min[s.subjectId] = week_min.get(s.subjectId, 0) + s.duracaoMinutos

    next_exam: dict[str, tuple[date, int]] = {}
    for e in exams:
        if e.data >= today_str:
            d = date.fromisoformat(e.data)
            if e.subjectId not in next_exam or d < next_exam[e.subjectId][0]:
                next_exam[e.subjectId] = (d, e.dificuldadeEsperada)

    scores = []
    for subj in subjects:
        obj_min = subj.objetivoSemanalHoras * 60
        studied = week_min.get(subj.id, 0)
        deficit = max(obj_min - studied, 0)

        urgency      = 1.0
        days_to_exam = None
        if subj.id in next_exam:
            exam_date, exam_diff = next_exam[subj.id]
            days_to_exam = (exam_date - today).days
            if days_to_exam <= 1:
                urgency = 5.0
            elif days_to_exam <= 3:
                urgency = 4.0
            elif days_to_exam <= 7:
                urgency = 3.0
            elif days_to_exam <= 14:
                urgency = 2.0
            else:
                urgency = 1.5
            urgency *= (1 + (exam_diff - 1) * 0.15)

        prio_factor = {"alta": 1.5, "media": 1.0, "baixa": 0.6}.get(subj.prioridade, 1.0)
        score = urgency * prio_factor * max(deficit / 60, 0.5)

        scores.append({
            "subjectId":  subj.id,
            "nome":       subj.nome,
            "cor":        subj.cor,
            "score":      score,
            "deficitMin": deficit,
            "objMin":     obj_min,
            "studiedMin": studied,
            "daysToExam": days_to_exam,
            "urgency":    urgency,
        })

    scores.sort(key=lambda x: -x["score"])
    return scores


# ── Distribuição de blocos ────────────────────────────────────────────────────

def _distribute_blocks(
    scores: list[dict],
    days: list[date],
    today: date,
) -> list[PlanDayModel]:
    if not scores:
        return [
            PlanDayModel(data=d.isoformat(), diaSemana=DIAS_SEMANA_PT[d.weekday()])
            for d in days
        ]

    relevant = [s for s in scores if s["deficitMin"] > 0 or s["daysToExam"] is not None]
    if not relevant:
        relevant = scores[:3]

    day_remaining: dict[str, float] = {}
    for d in days:
        if d < today:
            day_remaining[d.isoformat()] = 0.0
        elif d.weekday() == 6:  # Domingo
            day_remaining[d.isoformat()] = MAX_HORAS_DIA * 0.5
        else:
            day_remaining[d.isoformat()] = MAX_HORAS_DIA

    day_blocks: dict[str, list[PlanBlockModel]] = {d.isoformat(): [] for d in days}

    for subj in relevant:
        hours_needed = min(subj["deficitMin"] / 60, 8.0)
        if hours_needed < MIN_BLOCO_HORAS:
            hours_needed = MIN_BLOCO_HORAS

        available_days = [
            d.isoformat() for d in days
            if d >= today and day_remaining.get(d.isoformat(), 0) >= MIN_BLOCO_HORAS
        ]
        if not available_days:
            continue

        per_day = min(hours_needed / len(available_days), 2.0)
        per_day = _round_to_half(per_day)
        if per_day < MIN_BLOCO_HORAS:
            per_day = MIN_BLOCO_HORAS

        if subj["daysToExam"] is not None and subj["daysToExam"] <= 7:
            desc = f"Exame em {subj['daysToExam']} dia(s) — foca nos tópicos principais."
        elif subj["deficitMin"] > 0:
            desc = f"Faltam {round(subj['deficitMin'] / 60, 1)}h para o objetivo semanal."
        else:
            desc = "Manter o ritmo e rever conteúdos."

        hours_left = hours_needed
        for day_str in available_days:
            if hours_left < MIN_BLOCO_HORAS:
                break
            alloc = min(per_day, day_remaining[day_str], hours_left)
            alloc = _round_to_half(alloc)
            if alloc < MIN_BLOCO_HORAS:
                continue
            day_blocks[day_str].append(PlanBlockModel(
                disciplina=subj["nome"],
                subjectId=subj["subjectId"],
                cor=subj["cor"],
                horas=alloc,
                descricao=desc,
            ))
            day_remaining[day_str] -= alloc
            hours_left -= alloc

    plan_days = []
    for d in days:
        plan_days.append(PlanDayModel(
            data=d.isoformat(),
            diaSemana=DIAS_SEMANA_PT[d.weekday()],
            blocos=day_blocks.get(d.isoformat(), []),
        ))
    return plan_days


# ── Mensagem motivacional ─────────────────────────────────────────────────────

async def _generate_ai_message(
    scores: list[dict],
    days_to_exam: int | None,
    next_exam_name: str | None,
    total_horas: float,
) -> str:
    if not settings.GROQ_API_KEY:
        return _fallback_message(scores, days_to_exam, next_exam_name, total_horas)

    context_lines = []
    for s in scores[:4]:
        line = f"- {s['nome']}: score {s['score']:.1f}"
        if s["daysToExam"] is not None:
            line += f", exame em {s['daysToExam']} dia(s)"
        context_lines.append(line)
    context = "\n".join(context_lines)

    prompt = (
        f"Sou o StudyFlow AI. Gerei um plano semanal de {total_horas:.1f}h de estudo "
        f"distribuídas por esta semana.\n\n"
        f"Disciplinas prioritárias:\n{context}\n\n"
        + (f"Próximo exame: '{next_exam_name}' em {days_to_exam} dia(s).\n" if next_exam_name else "")
        + "Gera uma mensagem motivacional curta (2-3 frases) em português de Portugal "
        "para o estudante. Sê direto, positivo e específico. Não uses emojis em excesso."
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "max_tokens": 200,
                    "temperature": 0.8,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning(f"[PLAN] Groq fallback: {e}")

    return _fallback_message(scores, days_to_exam, next_exam_name, total_horas)


def _fallback_message(
    scores: list[dict],
    days_to_exam: int | None,
    next_exam_name: str | None,
    total_horas: float,
) -> str:
    if days_to_exam is not None and days_to_exam <= 3 and next_exam_name:
        return (
            f"Atenção: o exame de '{next_exam_name}' é em {days_to_exam} dia(s)! "
            "Foca-te nos tópicos principais e descansa bem antes do dia."
        )
    if next_exam_name:
        return (
            f"Tens {total_horas:.1f}h planeadas para esta semana. "
            f"Não te esqueças do exame de '{next_exam_name}' — o plano já o tem em conta. "
            "Boa semana de estudo!"
        )
    top = scores[0]["nome"] if scores else "as tuas disciplinas"
    return (
        f"Plano gerado com {total_horas:.1f}h distribuídas de forma equilibrada. "
        f"Dá especial atenção a {top} esta semana. Mantém o ritmo!"
    )


# ── Endpoint principal ────────────────────────────────────────────────────────

async def generate_study_plan(user_id: str) -> PlanGenerateResponse:
    today = date.today()
    days  = _days_of_week(today)

    scores    = _compute_priority_scores(user_id, today)
    plan_days = _distribute_blocks(scores, days, today)

    # ── BUG 2 CORRIGIDO: totalMinutos calculado explicitamente ───────────────
    # PlanDayModel.totalMinutos é uma @property — mas o PlanDaySchema
    # precisa de um int concreto. Calculamos aqui antes de construir o schema.
    total_horas = sum(
        sum(b.horas for b in d.blocos)
        for d in plan_days
    )

    exams     = exam_repo.list_by_user(user_id)
    today_str = today.isoformat()
    upcoming  = sorted(
        [e for e in exams if e.data >= today_str],
        key=lambda e: e.data,
    )
    next_exam_name: str | None = None
    days_to_exam: int | None   = None
    if upcoming:
        ne             = upcoming[0]
        next_exam_name = ne.titulo
        days_to_exam   = (date.fromisoformat(ne.data) - today).days

    mensagem_ia = await _generate_ai_message(
        scores, days_to_exam, next_exam_name, total_horas
    )

    import datetime as dt
    plan_model = StudyPlanModel(
        id=str(uuid.uuid4()),
        userId=user_id,
        semana=_iso_week(today),
        geradoEm=today.isoformat() + "T" + dt.datetime.now().strftime("%H:%M:%S"),
        diasAteExame=days_to_exam,
        proximoExame=next_exam_name,
        dias=plan_days,
        totalHorasPlano=round(total_horas, 2),
        mensagemIA=mensagem_ia,
    )

    try:
        plan_repo.delete_old_plans(user_id, keep=5)
        plan_repo.create(plan_model)
    except Exception as e:
        logger.error(f"[PLAN] Erro ao persistir plano: {e}")

    # ── Construir o schema com totalMinutos calculado explicitamente ──────────
    plan_schema = StudyPlanSchema(
        semana=plan_model.semana,
        geradoEm=plan_model.geradoEm,
        diasAteExame=plan_model.diasAteExame,
        proximoExame=plan_model.proximoExame,
        totalHorasPlano=plan_model.totalHorasPlano,
        mensagemIA=plan_model.mensagemIA,
        dias=[
            PlanDaySchema(
                data=d.data,
                diaSemana=d.diaSemana,
                # ← totalMinutos explícito, não depende da @property
                totalMinutos=round(sum(b.horas * 60 for b in d.blocos)),
                blocos=[
                    PlanDayBlockSchema(
                        disciplina=b.disciplina,
                        subjectId=b.subjectId,
                        cor=b.cor,
                        horas=b.horas,
                        descricao=b.descricao,
                    )
                    for b in d.blocos
                ],
            )
            for d in plan_model.dias
        ],
    )

    return PlanGenerateResponse(plan=plan_schema)


def get_plan_history(user_id: str) -> PlanHistoryResponse:
    plans = plan_repo.list_by_user(user_id, limit=10)
    return PlanHistoryResponse(
        plans=[
            PlanHistoryItem(
                id=p.id,
                semana=p.semana,
                geradoEm=p.geradoEm,
                totalHorasPlano=p.totalHorasPlano,
                proximoExame=p.proximoExame,
            )
            for p in plans
        ],
        total=len(plans),
    )
