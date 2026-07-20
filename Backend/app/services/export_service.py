"""
Serviço de exportação de planos de estudo em PDF.
Usa reportlab (já disponível ou adicionar ao requirements.txt).
"""
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from app.repositories.plan_repo import plan_repo
from app.utils.exceptions import NotFoundException


# ── Cores do StudyFlow ────────────────────────────────────────────────────────
SF_DARK   = colors.HexColor("#0F1117")
SF_CARD   = colors.HexColor("#1A1D2E")
SF_BLUE   = colors.HexColor("#7EB8F7")
SF_PURPLE = colors.HexColor("#A78BFA")
SF_TEXT   = colors.HexColor("#E2E8F0")
SF_MUTED  = colors.HexColor("#8892A4")
SF_REST   = colors.HexColor("#2D3748")
SF_WHITE  = colors.white


def _hex_to_color(hex_str: str) -> colors.HexColor:
    try:
        return colors.HexColor(hex_str)
    except Exception:
        return SF_BLUE


def _minutes_to_label(minutes: int) -> str:
    h = minutes // 60
    m = minutes % 60
    if h == 0:
        return f"{m}m"
    if m == 0:
        return f"{h}h"
    return f"{h}h {m}m"


def _horas_label(horas: float) -> str:
    return _minutes_to_label(round(horas * 60))


def generate_plan_pdf(user_id: str) -> bytes:
    """
    Gera o PDF do plano de estudo mais recente do utilizador.
    Devolve os bytes do PDF.
    """
    plan = plan_repo.get_latest(user_id)
    if not plan:
        raise NotFoundException("Nenhum plano encontrado. Gera um plano primeiro.")

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()

    # Estilos personalizados
    title_style = ParagraphStyle(
        "SFTitle",
        parent=styles["Normal"],
        fontSize=22,
        textColor=SF_WHITE,
        fontName="Helvetica-Bold",
        alignment=TA_LEFT,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "SFSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=SF_MUTED,
        fontName="Helvetica",
        alignment=TA_LEFT,
        spaceAfter=2,
    )
    section_style = ParagraphStyle(
        "SFSection",
        parent=styles["Normal"],
        fontSize=11,
        textColor=SF_BLUE,
        fontName="Helvetica-Bold",
        spaceBefore=14,
        spaceAfter=6,
    )
    ai_msg_style = ParagraphStyle(
        "SFAiMsg",
        parent=styles["Normal"],
        fontSize=9,
        textColor=SF_TEXT,
        fontName="Helvetica-Oblique",
        alignment=TA_LEFT,
        leading=14,
    )
    day_name_style = ParagraphStyle(
        "SFDayName",
        parent=styles["Normal"],
        fontSize=9,
        textColor=SF_BLUE,
        fontName="Helvetica-Bold",
    )
    day_date_style = ParagraphStyle(
        "SFDayDate",
        parent=styles["Normal"],
        fontSize=8,
        textColor=SF_MUTED,
        fontName="Helvetica",
    )
    block_subj_style = ParagraphStyle(
        "SFBlockSubj",
        parent=styles["Normal"],
        fontSize=9,
        textColor=SF_WHITE,
        fontName="Helvetica-Bold",
    )
    block_desc_style = ParagraphStyle(
        "SFBlockDesc",
        parent=styles["Normal"],
        fontSize=7.5,
        textColor=SF_MUTED,
        fontName="Helvetica",
        leading=10,
    )
    block_dur_style = ParagraphStyle(
        "SFBlockDur",
        parent=styles["Normal"],
        fontSize=8,
        textColor=SF_BLUE,
        fontName="Helvetica-Bold",
        alignment=TA_LEFT,
    )
    rest_style = ParagraphStyle(
        "SFRest",
        parent=styles["Normal"],
        fontSize=8,
        textColor=SF_MUTED,
        fontName="Helvetica-Oblique",
        alignment=TA_CENTER,
    )
    footer_style = ParagraphStyle(
        "SFFooter",
        parent=styles["Normal"],
        fontSize=7.5,
        textColor=SF_MUTED,
        fontName="Helvetica",
        alignment=TA_CENTER,
    )

    story = []

    # ── Cabeçalho ──────────────────────────────────────────────────────────────
    story.append(Paragraph("StudyFlow", title_style))
    story.append(Paragraph("Plano de Estudo Semanal", ParagraphStyle(
        "SFTitleSub", parent=styles["Normal"],
        fontSize=14, textColor=SF_PURPLE, fontName="Helvetica-Bold", spaceAfter=2,
    )))

    gerado_fmt = plan.geradoEm[:10] if plan.geradoEm else ""
    story.append(Paragraph(f"Semana {plan.semana}  ·  Gerado em {gerado_fmt}", subtitle_style))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=SF_CARD, spaceAfter=8))

    # ── Resumo ─────────────────────────────────────────────────────────────────
    total_min = sum(d.totalMinutos for d in plan.dias)
    dias_estudo = sum(1 for d in plan.dias if d.blocos)
    total_blocos = sum(len(d.blocos) for d in plan.dias)

    summary_data = [
        [
            Paragraph(f"<b><font color='#7EB8F7'>{_minutes_to_label(total_min)}</font></b><br/><font color='#8892A4' size='7'>Total planeado</font>", styles["Normal"]),
            Paragraph(f"<b><font color='#7EB8F7'>{dias_estudo}</font></b><br/><font color='#8892A4' size='7'>Dias de estudo</font>", styles["Normal"]),
            Paragraph(f"<b><font color='#7EB8F7'>{total_blocos}</font></b><br/><font color='#8892A4' size='7'>Blocos criados</font>", styles["Normal"]),
            Paragraph(
                f"<b><font color='#F87171'>{plan.diasAteExame}d</font></b><br/><font color='#8892A4' size='7'>para {plan.proximoExame or '—'}</font>"
                if plan.proximoExame else
                "<b><font color='#8892A4'>—</font></b><br/><font color='#8892A4' size='7'>Sem exames</font>",
                styles["Normal"]
            ),
        ]
    ]

    summary_table = Table(summary_data, colWidths=["25%", "25%", "25%", "25%"])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SF_CARD),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [SF_CARD]),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", (0, 0), (-1, -1), [6, 6, 6, 6]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#252840")),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.4 * cm))

    # ── Mensagem IA ───────────────────────────────────────────────────────────
    if plan.mensagemIA:
        story.append(Paragraph("✦  Mensagem do Agente", section_style))
        ai_table = Table(
            [[Paragraph(plan.mensagemIA, ai_msg_style)]],
            colWidths=["100%"],
        )
        ai_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1E2235")),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 14),
            ("RIGHTPADDING", (0, 0), (-1, -1), 14),
            ("LINEAFTER", (0, 0), (0, -1), 3, SF_PURPLE),
        ]))
        story.append(ai_table)
        story.append(Spacer(1, 0.4 * cm))

    # ── Dias ──────────────────────────────────────────────────────────────────
    story.append(Paragraph("Plano Detalhado", section_style))

    for day in plan.dias:
        # Header do dia
        day_header_data = [[
            Paragraph(day.diaSemana.upper(), day_name_style),
            Paragraph(day.data, day_date_style),
            Paragraph(
                _minutes_to_label(day.totalMinutos) if day.totalMinutos > 0 else "Descanso",
                ParagraphStyle("SFDayTotal", parent=styles["Normal"],
                               fontSize=8, textColor=SF_BLUE if day.totalMinutos > 0 else SF_MUTED,
                               fontName="Helvetica-Bold", alignment=TA_LEFT),
            ),
        ]]
        day_header = Table(day_header_data, colWidths=["40%", "30%", "30%"])
        day_header.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#252840")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (0, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(day_header)

        if not day.blocos:
            rest_table = Table(
                [[Paragraph("✦  Dia de descanso", rest_style)]],
                colWidths=["100%"],
            )
            rest_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), SF_REST),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ]))
            story.append(rest_table)
        else:
            for block in day.blocos:
                block_color = _hex_to_color(block.cor)
                block_data = [[
                    "",  # coluna de cor (accent bar)
                    [
                        Paragraph(block.disciplina, block_subj_style),
                        Paragraph(block.descricao, block_desc_style) if block.descricao else Spacer(1, 1),
                    ],
                    Paragraph(_horas_label(block.horas), block_dur_style),
                ]]
                block_table = Table(block_data, colWidths=[0.25 * cm, "75%", "20%"])
                block_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), SF_CARD),
                    ("BACKGROUND", (0, 0), (0, -1), block_color),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                    ("LEFTPADDING", (1, 0), (1, -1), 10),
                    ("LEFTPADDING", (0, 0), (0, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#252840")),
                ]))
                story.append(block_table)

        story.append(Spacer(1, 0.15 * cm))

    # ── Rodapé ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=SF_CARD, spaceAfter=6))
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    story.append(Paragraph(
        f"Gerado pelo StudyFlow — Assistente Inteligente de Estudo  ·  {now_str}",
        footer_style,
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
