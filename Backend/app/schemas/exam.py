from pydantic import BaseModel, field_validator
from typing import Optional, List
import re

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class ExamCreateRequest(BaseModel):
    subjectId: str
    titulo: str
    data: str                          # "YYYY-MM-DD"
    dificuldadeEsperada: int = 3       # 1-5
    local: str = ""
    notas: str = ""
    notaObtida: Optional[float] = None

    @field_validator("subjectId")
    @classmethod
    def validate_subject(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("subjectId não pode estar vazio")
        return v.strip()

    @field_validator("titulo")
    @classmethod
    def validate_titulo(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("O título não pode estar vazio")
        if len(v) > 120:
            raise ValueError("Título demasiado longo (máx. 120 caracteres)")
        return v

    @field_validator("data")
    @classmethod
    def validate_data(cls, v: str) -> str:
        if not DATE_RE.match(v):
            raise ValueError("data deve estar no formato YYYY-MM-DD")
        return v

    @field_validator("dificuldadeEsperada")
    @classmethod
    def validate_dificuldade(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("dificuldadeEsperada deve estar entre 1 e 5")
        return v

    @field_validator("notaObtida")
    @classmethod
    def validate_nota(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < 0 or v > 20):
            raise ValueError("notaObtida deve estar entre 0 e 20")
        return v


class ExamUpdateRequest(BaseModel):
    subjectId: Optional[str] = None
    titulo: Optional[str] = None
    data: Optional[str] = None
    dificuldadeEsperada: Optional[int] = None
    local: Optional[str] = None
    notas: Optional[str] = None
    notaObtida: Optional[float] = None

    @field_validator("titulo")
    @classmethod
    def validate_titulo(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("O título não pode estar vazio")
        return v

    @field_validator("data")
    @classmethod
    def validate_data(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not DATE_RE.match(v):
            raise ValueError("data deve estar no formato YYYY-MM-DD")
        return v

    @field_validator("dificuldadeEsperada")
    @classmethod
    def validate_dificuldade(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 5):
            raise ValueError("dificuldadeEsperada deve estar entre 1 e 5")
        return v

    @field_validator("notaObtida")
    @classmethod
    def validate_nota(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < 0 or v > 20):
            raise ValueError("notaObtida deve estar entre 0 e 20")
        return v


class ExamResponse(BaseModel):
    id: str
    userId: str
    subjectId: str
    titulo: str
    data: str
    dificuldadeEsperada: int
    local: str
    notas: str
    notaObtida: Optional[float]


class ExamListResponse(BaseModel):
    exams: List[ExamResponse]
    total: int