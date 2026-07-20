from fastapi import APIRouter, Depends, status

from app.core.security import get_current_user_id
from app.schemas.subject import (
    SubjectCreateRequest, SubjectUpdateRequest,
    SubjectResponse, SubjectListResponse,
)
from app.services.subject_service import (
    list_subjects, create_subject, get_subject,
    update_subject, delete_subject,
)

router = APIRouter()


@router.get("", response_model=SubjectListResponse)
def list_all(user_id: str = Depends(get_current_user_id)):
    """Lista todas as disciplinas do utilizador autenticado."""
    return list_subjects(user_id)


@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create(payload: SubjectCreateRequest, user_id: str = Depends(get_current_user_id)):
    """Cria uma nova disciplina."""
    return create_subject(user_id, payload)


@router.get("/{subject_id}", response_model=SubjectResponse)
def get_one(subject_id: str, user_id: str = Depends(get_current_user_id)):
    """Devolve uma disciplina pelo id."""
    return get_subject(user_id, subject_id)


@router.patch("/{subject_id}", response_model=SubjectResponse)
def update(subject_id: str, payload: SubjectUpdateRequest, user_id: str = Depends(get_current_user_id)):
    """Atualiza campos de uma disciplina."""
    return update_subject(user_id, subject_id, payload)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(subject_id: str, user_id: str = Depends(get_current_user_id)):
    """Elimina uma disciplina."""
    delete_subject(user_id, subject_id)
