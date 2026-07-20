"""
Router de Exportação.

Endpoints:
  GET /export/pdf  — devolve o PDF do plano semanal mais recente
"""
from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.security import get_current_user_id
from app.services.export_service import generate_plan_pdf

router = APIRouter()


@router.get("/pdf")
def export_pdf(user_id: str = Depends(get_current_user_id)):
    """
    Gera e devolve o PDF do plano de estudo mais recente do utilizador.
    O browser vai receber o ficheiro com o nome 'plano_semanal.pdf'.
    """
    pdf_bytes = generate_plan_pdf(user_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=plano_semanal.pdf",
            "Content-Length": str(len(pdf_bytes)),
        },
    )
