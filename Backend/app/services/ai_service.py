"""
Serviço do agente de IA — constrói o contexto com dados reais
do utilizador e chama a Groq API (compatível com OpenAI).
"""
import uuid
import httpx
from datetime import date, timedelta

from app.core.config import settings
from app.repositories.session_repo import session_repo
from app.repositories.subject_repo import subject_repo
from app.repositories.exam_repo import exam_repo
from app.repositories.chat_history_repo import chat_history_repo
from app.repositories.suggestion_repo import suggestion_repo
from app.models.chat_history import ChatHistoryModel
from app.models.suggestion import SuggestionModel
from app.schemas.ai import (
    AIChatRequest, AIChatResponse,
    ChatHistoryResponse, ChatHistoryItem,
    SuggestionsListResponse, SuggestionResponse,
)
from app.utils.exceptions import StudyFlowException


GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"  # modelo rápido e capaz disponível no Groq

SYSTEM_PROMPT = """
És o StudyFlow AI, um assistente de estudo pessoal inteligente integrado na aplicação StudyFlow.
Respondes SEMPRE em português de Portugal, de forma clara, direta e motivadora.
Tens acesso aos dados reais do utilizador e baseias todas as tuas respostas nesses dados.
Nunca inventas dados — se não souberes algo, dizes que não tens informação suficiente.
Quando relevante, dás sugestões concretas e acionáveis sobre como melhorar o estudo.

DADOS ATUAIS DO UTILIZADOR:
{context}

Data de hoje: {today}
""".strip()


def _build_context(user_id: str) -> str:
    subjects = subject_repo.list_by_user(user_id)
    sessions = session_repo.list_by_user(user_id)
    exams    = exam_repo.list_by_user(user_id)
    today    = date.today().isoformat()
    sub_map  = {s.id: s.nome for s in subjects}

    subs_txt = "\n".join(
        f"  - {s.nome} (prioridade: {s.prioridade}, objetivo: {s.objetivoSemanalHoras}h/semana)"
        for s in subjects
    ) if subjects else "  Nenhuma disciplina registada."

    recent = sessions[:30]
    if recent:
        total_min = sum(s.duracaoMinutos for s in sessions)
        avg_foco  = sum(s.foco for s in sessions) / len(sessions)
        mpd: dict[str, int] = {}
        for s in sessions:
            mpd[s.subjectId] = mpd.get(s.subjectId, 0) + s.duracaoMinutos
        mpd_txt = ", ".join(
            f"{sub_map.get(sid, sid)}: {m // 60}h{m % 60}m"
            for sid, m in sorted(mpd.items(), key=lambda x: -x[1])
        )
        sess_txt = (
            f"  Total: {len(sessions)} sessões — {total_min // 60}h{total_min % 60}m\n"
            f"  Foco médio: {avg_foco:.1f}/5\n"
            f"  Por disciplina: {mpd_txt}\n  Últimas sessões:\n"
        )
        for s in recent[:10]:
            nome = sub_map.get(s.subjectId, s.subjectId)
            sess_txt += f"    · {s.data} — {nome} — {s.duracaoMinutos}min — foco {s.foco}/5"
            if s.humor:
                sess_txt += f" — humor {s.humor}/5"
            if s.notas:
                sess_txt += f' — "{s.notas[:60]}"'
            sess_txt += "\n"
    else:
        sess_txt = "  Nenhuma sessão registada ainda."

    upcoming = [e for e in exams if e.data >= today]
    past     = [e for e in exams if e.data < today]

    exam_up = "\n".join(
        f"  - {e.titulo} ({sub_map.get(e.subjectId, e.subjectId)}) — {e.data} — dif. {e.dificuldadeEsperada}/5"
        for e in upcoming
    ) if upcoming else "  Nenhum exame próximo."

    exam_past = "\n".join(
        f"  - {e.titulo} ({sub_map.get(e.subjectId, e.subjectId)}) — {e.data}"
        + (f" — nota: {e.notaObtida}" if e.notaObtida is not None else " — sem nota")
        for e in past[:5]
    ) if past else "  Nenhum exame passado."

    return (
        f"DISCIPLINAS:\n{subs_txt}\n\n"
        f"SESSÕES DE ESTUDO:\n{sess_txt}\n"
        f"EXAMES PRÓXIMOS:\n{exam_up}\n\n"
        f"EXAMES PASSADOS (últimos 5):\n{exam_past}"
    )


async def chat_with_agent(user_id: str, payload: AIChatRequest) -> AIChatResponse:
    import logging
    logger = logging.getLogger(__name__)

    if not settings.GROQ_API_KEY:
        raise StudyFlowException("GROQ_API_KEY não configurada no .env")

    context     = _build_context(user_id)
    system_text = SYSTEM_PROMPT.format(context=context, today=date.today().isoformat())

    # Construir messages no formato OpenAI (system + history + mensagem atual)
    messages = [{"role": "system", "content": system_text}]

    for msg in payload.history:
        # Groq usa "assistant" em vez de "model"
        role = "assistant" if msg.role == "model" else msg.role
        messages.append({"role": role, "content": msg.content})

    # Adicionar mensagem atual se não estiver já como último item user
    already_last = (
        len(messages) > 1
        and messages[-1]["role"] == "user"
        and messages[-1]["content"] == payload.message
    )
    if not already_last:
        messages.append({"role": "user", "content": payload.message})

    body = {
        "model": GROQ_MODEL,
        "max_tokens": 1024,
        "temperature": 0.7,
        "messages": messages,
    }

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(GROQ_URL, headers=headers, json=body)

    if resp.status_code == 400:
        err_msg = resp.json().get("error", {}).get("message", resp.text[:300])
        logger.error(f"[GROQ 400] {err_msg}")
        raise StudyFlowException(f"Groq erro 400: {err_msg}")

    if resp.status_code == 401:
        raise StudyFlowException("Groq: chave de API inválida (401). Verifica GROQ_API_KEY no .env")

    if resp.status_code == 429:
        raise StudyFlowException("Groq: limite de pedidos atingido (rate limit). Aguarda uns segundos.")

    if resp.status_code >= 400:
        raise StudyFlowException(f"Groq erro ({resp.status_code}): {resp.text[:200]}")

    data = resp.json()
    try:
        reply = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        reply = "Desculpa, não consegui gerar uma resposta. Tenta novamente."

    # Persistir no Firestore
    try:
        chat_history_repo.add_message(
            ChatHistoryModel(id=str(uuid.uuid4()), userId=user_id, role="user", content=payload.message)
        )
        chat_history_repo.add_message(
            ChatHistoryModel(id=str(uuid.uuid4()), userId=user_id, role="model", content=reply)
        )
    except Exception:
        pass

    return AIChatResponse(reply=reply)


def get_chat_history(user_id: str) -> ChatHistoryResponse:
    msgs = chat_history_repo.list_by_user(user_id, limit=100)
    return ChatHistoryResponse(
        messages=[
            ChatHistoryItem(
                id=m.id, role=m.role, content=m.content,
                createdAt=str(m.createdAt) if m.createdAt else None,
            )
            for m in msgs
        ],
        total=len(msgs),
    )


def generate_suggestions(user_id: str) -> SuggestionsListResponse:
    subjects  = subject_repo.list_by_user(user_id)
    sessions  = session_repo.list_by_user(user_id)
    exams     = exam_repo.list_by_user(user_id)
    today     = date.today()
    today_str = today.isoformat()
    sub_map   = {s.id: s for s in subjects}

    try:
        suggestion_repo.delete_old(user_id)
    except Exception:
        pass

    new_sugg: list[SuggestionModel] = []

    last_session: dict[str, str] = {}
    for s in sessions:
        if s.subjectId not in last_session or s.data > last_session[s.subjectId]:
            last_session[s.subjectId] = s.data

    week_start = (today - timedelta(days=today.weekday())).isoformat()
    week_min: dict[str, int] = {}
    for s in sessions:
        if s.data >= week_start:
            week_min[s.subjectId] = week_min.get(s.subjectId, 0) + s.duracaoMinutos

    # Regra 1: Spaced Repetition
    for subj in subjects:
        last     = last_session.get(subj.id)
        days_ago = (today - date.fromisoformat(last)).days if last else 999
        if days_ago >= 7:
            msg = (
                f"Não estudas {subj.nome} há {days_ago} dias. Faz uma revisão hoje!"
                if days_ago < 999
                else f"Ainda não estudaste {subj.nome}. Começa hoje!"
            )
            new_sugg.append(SuggestionModel(
                id=str(uuid.uuid4()), userId=user_id,
                mensagem=msg, tipo="spaced_repetition", subjectId=subj.id,
            ))

    # Regra 2: Desequilíbrio semanal
    for subj in subjects:
        goal_min = subj.objetivoSemanalHoras * 60
        if goal_min > 0 and week_min.get(subj.id, 0) / goal_min < 0.2:
            new_sugg.append(SuggestionModel(
                id=str(uuid.uuid4()), userId=user_id,
                mensagem=(
                    f"{subj.nome}: só {round(week_min.get(subj.id,0)/60,1)}h "
                    f"de {subj.objetivoSemanalHoras}h esta semana. Prioriza hoje."
                ),
                tipo="desequilibrio", subjectId=subj.id,
            ))

    # Regra 3: Exame próximo com pouco estudo
    for exam in exams:
        if exam.data < today_str:
            continue
        days_until = (date.fromisoformat(exam.data) - today).days
        if days_until > 7:
            continue
        subj = sub_map.get(exam.subjectId)
        if subj and subj.objetivoSemanalHoras * 60 > 0:
            studied = week_min.get(exam.subjectId, 0)
            if studied < subj.objetivoSemanalHoras * 60 * 0.3:
                new_sugg.append(SuggestionModel(
                    id=str(uuid.uuid4()), userId=user_id,
                    mensagem=(
                        f"'{exam.titulo}' em {days_until} dia(s) — "
                        f"apenas {round(studied/60,1)}h estudadas esta semana!"
                    ),
                    tipo="exame_proximo", subjectId=exam.subjectId,
                ))

    # Regra 4: Pomodoro
    long_low = [s for s in sessions[:20] if s.duracaoMinutos > 90 and s.foco < 3]
    if len(long_low) >= 2:
        new_sugg.append(SuggestionModel(
            id=str(uuid.uuid4()), userId=user_id,
            mensagem="Sessões longas com foco baixo detetadas. Experimenta Pomodoro: 25min + 5min pausa.",
            tipo="pomodoro", subjectId="",
        ))

    for s in new_sugg[:10]:
        try:
            suggestion_repo.create(s)
        except Exception:
            pass

    all_sugg = suggestion_repo.list_by_user(user_id, apenas_nao_lidas=True)
    return SuggestionsListResponse(
        suggestions=[
            SuggestionResponse(
                id=s.id, userId=s.userId, mensagem=s.mensagem,
                tipo=s.tipo, subjectId=s.subjectId, lida=s.lida,
            )
            for s in all_sugg
        ],
        total=len(all_sugg),
    )


def get_suggestions(user_id: str) -> SuggestionsListResponse:
    all_sugg = suggestion_repo.list_by_user(user_id)
    return SuggestionsListResponse(
        suggestions=[
            SuggestionResponse(
                id=s.id, userId=s.userId, mensagem=s.mensagem,
                tipo=s.tipo, subjectId=s.subjectId, lida=s.lida,
            )
            for s in all_sugg
        ],
        total=len(all_sugg),
    )


def mark_suggestion_read(suggestion_id: str) -> None:
    suggestion_repo.mark_as_read(suggestion_id)
