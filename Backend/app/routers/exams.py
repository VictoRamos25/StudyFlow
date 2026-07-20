from fastapi import APIRouter, Depends, Query, status
from typing import Optional

from app.core.security import get_current_user_id
from app.schemas.exam import (
    ExamCreateRequest, ExamUpdateRequest,
    ExamResponse, ExamListResponse,
)
from app.services.exam_service import (
    list_exams, create_exam, get_exam,
    update_exam, delete_exam,
)

router = APIRouter()


@router.get("", response_model=ExamListResponse)
def list_all(
    subject_id: Optional[str] = Query(None, alias="subjectId"),
    user_id: str = Depends(get_current_user_id),
):
    """Lista todos os exames do utilizador. Filtrável por disciplina."""
    return list_exams(user_id, subject_id)


@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create(payload: ExamCreateRequest, user_id: str = Depends(get_current_user_id)):
    """Cria um novo exame."""
    return await create_exam(user_id, payload)


@router.get("/{exam_id}", response_model=ExamResponse)
def get_one(exam_id: str, user_id: str = Depends(get_current_user_id)):
    """Devolve um exame pelo id."""
    return get_exam(user_id, exam_id)


@router.patch("/{exam_id}", response_model=ExamResponse)
def update(exam_id: str, payload: ExamUpdateRequest, user_id: str = Depends(get_current_user_id)):
    """Atualiza campos de um exame (incluindo nota obtida após o exame)."""
    return update_exam(user_id, exam_id, payload)


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(exam_id: str, user_id: str = Depends(get_current_user_id)):
    """Elimina um exame."""
    delete_exam(user_id, exam_id)
