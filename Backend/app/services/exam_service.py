"""
Serviço de exames — toda a lógica de negócio.
"""
import uuid

from app.models.exam import ExamModel
from app.repositories.exam_repo import exam_repo
from app.repositories.user_repo import user_repo
from app.repositories.subject_repo import subject_repo
from app.schemas.exam import ExamCreateRequest, ExamUpdateRequest, ExamResponse, ExamListResponse
from app.services.notification_service import send_exam_reminder
from app.utils.exceptions import NotFoundException, BadRequestException


def _to_response(e: ExamModel) -> ExamResponse:
    return ExamResponse(
        id=e.id,
        userId=e.userId,
        subjectId=e.subjectId,
        titulo=e.titulo,
        data=e.data,
        dificuldadeEsperada=e.dificuldadeEsperada,
        local=e.local,
        notas=e.notas,
        notaObtida=e.notaObtida,
    )


def list_exams(user_id: str, subject_id: str | None = None) -> ExamListResponse:
    if subject_id:
        exams = exam_repo.list_by_subject(user_id, subject_id)
    else:
        exams = exam_repo.list_by_user(user_id)
    return ExamListResponse(
        exams=[_to_response(e) for e in exams],
        total=len(exams),
    )


async def create_exam(user_id: str, data: ExamCreateRequest) -> ExamResponse:
    exam = ExamModel(
        id=str(uuid.uuid4()),
        userId=user_id,
        subjectId=data.subjectId,
        titulo=data.titulo.strip(),
        data=data.data,
        dificuldadeEsperada=data.dificuldadeEsperada,
        local=(data.local or "").strip(),
        notas=(data.notas or "").strip(),
        notaObtida=data.notaObtida,
    )
    exam_repo.create(exam)

    # Enviar lembrete por email se o exame for dentro de ≤ 7 dias
    # (fire-and-forget — nunca bloqueia a criação do exame)
    user = user_repo.get_by_id(user_id)
    if user and user.notificationsEnabled:
        subject_nome = ""
        try:
            subj = subject_repo.get_by_id(data.subjectId)
            subject_nome = subj.nome if subj else ""
        except Exception:
            pass

        await send_exam_reminder(
            email=user.email,
            nome=user.nome,
            titulo=exam.titulo,
            exam_date=exam.data,
            dificuldade=exam.dificuldadeEsperada,
            subject_nome=subject_nome,
        )

    return _to_response(exam)


def get_exam(user_id: str, exam_id: str) -> ExamResponse:
    exam = exam_repo.get_by_id(exam_id)
    if not exam or exam.userId != user_id:
        raise NotFoundException("Exame não encontrado")
    return _to_response(exam)


def update_exam(user_id: str, exam_id: str, data: ExamUpdateRequest) -> ExamResponse:
    exam = exam_repo.get_by_id(exam_id)
    if not exam or exam.userId != user_id:
        raise NotFoundException("Exame não encontrado")

    # exclude_unset=True garante que campos não enviados são ignorados
    # mas campos enviados explicitamente como null (ex: notaObtida: null) são preservados
    fields = data.model_dump(exclude_unset=True)

    if not fields:
        raise BadRequestException("Nenhum campo para atualizar")

    if "titulo" in fields and fields["titulo"]:
        fields["titulo"] = fields["titulo"].strip()
    if "local" in fields and fields["local"]:
        fields["local"] = fields["local"].strip()

    exam_repo.update(exam_id, fields)
    updated = exam_repo.get_by_id(exam_id)
    return _to_response(updated)


def delete_exam(user_id: str, exam_id: str) -> None:
    exam = exam_repo.get_by_id(exam_id)
    if not exam or exam.userId != user_id:
        raise NotFoundException("Exame não encontrado")
    exam_repo.delete(exam_id)