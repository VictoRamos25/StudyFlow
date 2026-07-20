"""
Serviço de disciplinas — toda a lógica de negócio.
"""
import uuid

from app.models.subject import SubjectModel
from app.repositories.subject_repo import subject_repo
from app.schemas.subject import SubjectCreateRequest, SubjectUpdateRequest, SubjectResponse, SubjectListResponse
from app.utils.exceptions import NotFoundException, BadRequestException


def _to_response(s: SubjectModel) -> SubjectResponse:
    return SubjectResponse(
        id=s.id,
        userId=s.userId,
        nome=s.nome,
        creditos=s.creditos,
        prioridade=s.prioridade,
        objetivoSemanalHoras=s.objetivoSemanalHoras,
        cor=s.cor,
    )


def list_subjects(user_id: str) -> SubjectListResponse:
    subjects = subject_repo.list_by_user(user_id)
    return SubjectListResponse(
        subjects=[_to_response(s) for s in subjects],
        total=len(subjects),
    )


def create_subject(user_id: str, data: SubjectCreateRequest) -> SubjectResponse:
    existing = subject_repo.list_by_user(user_id)
    if any(s.nome.lower() == data.nome.strip().lower() for s in existing):
        raise BadRequestException("Já tens uma disciplina com este nome")

    subject = SubjectModel(
        id=str(uuid.uuid4()),
        userId=user_id,
        nome=data.nome.strip(),
        creditos=data.creditos,
        prioridade=data.prioridade,
        objetivoSemanalHoras=data.objetivoSemanalHoras,
        cor=data.cor,
    )
    subject_repo.create(subject)
    return _to_response(subject)


def get_subject(user_id: str, subject_id: str) -> SubjectResponse:
    subject = subject_repo.get_by_id(subject_id)
    if not subject or subject.userId != user_id:
        raise NotFoundException("Disciplina não encontrada")
    return _to_response(subject)


def update_subject(user_id: str, subject_id: str, data: SubjectUpdateRequest) -> SubjectResponse:
    subject = subject_repo.get_by_id(subject_id)
    if not subject or subject.userId != user_id:
        raise NotFoundException("Disciplina não encontrada")

    # Usar is not None em vez de avaliar truthiness, para permitir 0 e 0.0
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not fields:
        raise BadRequestException("Nenhum campo para atualizar")

    # Verificar duplicado de nome (excluindo a própria disciplina)
    if "nome" in fields:
        existing = subject_repo.list_by_user(user_id)
        if any(s.nome.lower() == fields["nome"].strip().lower() and s.id != subject_id for s in existing):
            raise BadRequestException("Já tens uma disciplina com este nome")
        fields["nome"] = fields["nome"].strip()

    subject_repo.update(subject_id, fields)

    updated = subject_repo.get_by_id(subject_id)
    return _to_response(updated)


def delete_subject(user_id: str, subject_id: str) -> None:
    subject = subject_repo.get_by_id(subject_id)
    if not subject or subject.userId != user_id:
        raise NotFoundException("Disciplina não encontrada")
    subject_repo.delete(subject_id)
