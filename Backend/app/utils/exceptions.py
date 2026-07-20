class StudyFlowException(Exception):
    """Base para todas as exceções de domínio."""

class BadRequestException(StudyFlowException):
    """400 — pedido inválido ou dados incorretos."""

class UnauthorizedException(StudyFlowException):
    """401 — não autenticado ou token inválido."""

class NotFoundException(StudyFlowException):
    """404 — recurso não encontrado."""

class ConflictException(StudyFlowException):
    """409 — conflito (email ou username já em uso)."""
