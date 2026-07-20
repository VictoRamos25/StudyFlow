"""
Serviço de notificações — integração com Resend API.

Três tipos de email alinhados com o contexto da app:
  1. welcome_email      — enviado após registo bem-sucedido
  2. exam_reminder      — enviado quando um exame é criado com data próxima (≤ 7 dias)
  3. weekly_wrapped     — resumo semanal, respeitando a flag weeklyWrappedEnabled do utilizador

Utilização: todas as funções são async e nunca levantam excepções para o caller —
os erros são logados internamente para não interromper o fluxo principal da app.
"""
import logging
from datetime import date, timedelta

import resend

from app.core.config import settings

logger = logging.getLogger(__name__)

# Dias de antecedência para considerar um exame "próximo"
EXAM_REMINDER_DAYS = 7


def _init_resend() -> bool:
    """Inicializa o cliente Resend. Devolve False se a chave não estiver configurada."""
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY não configurada — emails desativados")
        return False
    resend.api_key = settings.RESEND_API_KEY
    return True


# ─────────────────────────────────────────────────────────────────────────────
# Templates HTML
# ─────────────────────────────────────────────────────────────────────────────

def _base_html(title: str, content: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{title}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f4f4f5; margin: 0; padding: 32px 16px; color: #18181b; }}
    .card {{ background: #ffffff; border-radius: 16px; max-width: 560px;
             margin: 0 auto; padding: 40px 36px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }}
    .logo {{ font-size: 22px; font-weight: 700; color: #6366f1; margin-bottom: 28px; }}
    h1 {{ font-size: 24px; font-weight: 700; margin: 0 0 8px; }}
    p  {{ font-size: 15px; line-height: 1.6; color: #52525b; margin: 0 0 16px; }}
    .highlight {{ background: #eef2ff; border-left: 4px solid #6366f1;
                  border-radius: 8px; padding: 14px 18px; margin: 20px 0; }}
    .stat {{ display: inline-block; background: #f4f4f5; border-radius: 10px;
             padding: 10px 18px; margin: 6px 4px; text-align: center; }}
    .stat-value {{ font-size: 26px; font-weight: 700; color: #6366f1; display: block; }}
    .stat-label {{ font-size: 12px; color: #71717a; }}
    .footer {{ margin-top: 32px; font-size: 12px; color: #a1a1aa; text-align: center; }}
    .badge-danger  {{ color: #ef4444; font-weight: 600; }}
    .badge-warning {{ color: #f59e0b; font-weight: 600; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">📚 StudyFlow</div>
    {content}
    <div class="footer">StudyFlow — O teu companheiro de estudo &nbsp;·&nbsp; Não respondas a este email</div>
  </div>
</body>
</html>"""


def _welcome_html(nome: str) -> str:
    first = nome.split()[0] if nome else "Estudante"
    content = f"""
    <h1>Bem-vindo(a) ao StudyFlow, {first}! 🎉</h1>
    <p>A tua conta foi criada com sucesso. Estás pronto(a) para transformar a forma como estudas.</p>
    <div class="highlight">
      <p style="margin:0; color:#3730a3; font-weight:600;">O que podes fazer agora:</p>
      <p style="margin:8px 0 0;">✅ Adiciona as tuas disciplinas<br>
         ✅ Regista sessões de estudo com o modo foco<br>
         ✅ Cria exames e recebe lembretes automáticos<br>
         ✅ Acompanha o teu progresso no dashboard semanal</p>
    </div>
    <p>Bons estudos! 🚀</p>
    """
    return _base_html("Bem-vindo ao StudyFlow", content)


def _exam_reminder_html(nome: str, titulo: str, exam_date: str, dias: int,
                        dificuldade: int, subject_nome: str) -> str:
    first = nome.split()[0] if nome else "Estudante"
    urgency_class = "badge-danger" if dias <= 2 else "badge-warning"
    dif_stars = "⭐" * dificuldade
    content = f"""
    <h1>Lembrete de exame 📋</h1>
    <p>Olá {first}, criaste um novo exame. Não te esqueças de preparar!</p>
    <div class="highlight">
      <p style="margin:0 0 6px;"><strong>{titulo}</strong></p>
      <p style="margin:0; font-size:14px; color:#52525b;">
        📅 Data: <strong>{exam_date}</strong><br>
        📖 Disciplina: {subject_nome}<br>
        ⭐ Dificuldade esperada: {dif_stars} ({dificuldade}/5)
      </p>
    </div>
    <p>Faltam <span class="{urgency_class}">{dias} {'dia' if dias == 1 else 'dias'}</span> para o exame.</p>
    <p>Planeia as tuas sessões de estudo com antecedência para chegar preparado(a)! 💪</p>
    """
    return _base_html("Lembrete de exame — StudyFlow", content)


def _weekly_wrapped_html(nome: str, horas: float, sessoes: int,
                         streak: int, media_foco: float,
                         top_subject: str | None,
                         proximo_exame: dict | None) -> str:
    first = nome.split()[0] if nome else "Estudante"
    streak_emoji = "🔥" if streak >= 3 else "📅"
    foco_pct = int(media_foco * 100) if media_foco <= 1 else int(media_foco)

    exam_block = ""
    if proximo_exame:
        dias_r = proximo_exame.get("diasRestantes", 0)
        exam_block = f"""
        <div class="highlight">
          <p style="margin:0; font-weight:600;">📋 Próximo exame</p>
          <p style="margin:4px 0 0; font-size:14px;">
            {proximo_exame.get('titulo', '')} — <strong>{proximo_exame.get('data', '')}</strong>
            &nbsp;({dias_r} {'dia' if dias_r == 1 else 'dias'})
          </p>
        </div>"""

    top_block = f"<p>📖 Disciplina mais estudada esta semana: <strong>{top_subject}</strong></p>" if top_subject else ""

    content = f"""
    <h1>O teu Weekly Wrapped 📊</h1>
    <p>Olá {first}! Aqui está o resumo da tua semana de estudo.</p>
    <div>
      <span class="stat"><span class="stat-value">{horas:.1f}h</span><span class="stat-label">Horas estudadas</span></span>
      <span class="stat"><span class="stat-value">{sessoes}</span><span class="stat-label">Sessões</span></span>
      <span class="stat"><span class="stat-value">{streak_emoji} {streak}</span><span class="stat-label">Dias seguidos</span></span>
      <span class="stat"><span class="stat-value">{foco_pct}%</span><span class="stat-label">Foco médio</span></span>
    </div>
    {top_block}
    {exam_block}
    <p style="margin-top:20px;">Continua assim! Cada sessão conta. 🎯</p>
    """
    return _base_html("O teu Weekly Wrapped — StudyFlow", content)


# ─────────────────────────────────────────────────────────────────────────────
# Funções públicas
# ─────────────────────────────────────────────────────────────────────────────

async def send_welcome_email(email: str, nome: str) -> None:
    """Envia email de boas-vindas após registo. Fire-and-forget."""
    if not _init_resend():
        return
    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": [email],
            "subject": "Bem-vindo(a) ao StudyFlow! 🎉",
            "html": _welcome_html(nome),
        })
        logger.info("Welcome email enviado para %s", email)
    except Exception as exc:
        logger.error("Erro ao enviar welcome email para %s: %s", email, exc)


async def send_exam_reminder(
    email: str,
    nome: str,
    titulo: str,
    exam_date: str,
    dificuldade: int,
    subject_nome: str,
) -> None:
    """
    Envia lembrete de exame se a data for dentro de EXAM_REMINDER_DAYS dias.
    Silencioso se o exame for mais distante ou se Resend não estiver configurado.
    """
    if not _init_resend():
        return
    try:
        today = date.today()
        exam_dt = date.fromisoformat(exam_date)
        dias = (exam_dt - today).days

        if dias < 0 or dias > EXAM_REMINDER_DAYS:
            return  # exame no passado ou suficientemente distante

        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": [email],
            "subject": f"📋 Exame em {dias} {'dia' if dias == 1 else 'dias'}: {titulo}",
            "html": _exam_reminder_html(nome, titulo, exam_date, dias, dificuldade, subject_nome),
        })
        logger.info("Exam reminder enviado para %s (exame '%s' em %s dias)", email, titulo, dias)
    except Exception as exc:
        logger.error("Erro ao enviar exam reminder para %s: %s", email, exc)


async def send_weekly_wrapped(
    email: str,
    nome: str,
    horas: float,
    sessoes: int,
    streak: int,
    media_foco: float,
    top_subject: str | None = None,
    proximo_exame: dict | None = None,
) -> None:
    """Envia o resumo semanal (Weekly Wrapped) ao utilizador."""
    if not _init_resend():
        return
    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": [email],
            "subject": "📊 O teu Weekly Wrapped chegou!",
            "html": _weekly_wrapped_html(
                nome, horas, sessoes, streak, media_foco, top_subject, proximo_exame
            ),
        })
        logger.info("Weekly wrapped enviado para %s", email)
    except Exception as exc:
        logger.error("Erro ao enviar weekly wrapped para %s: %s", email, exc)
