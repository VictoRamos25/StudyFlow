from pydantic import BaseModel, field_validator
from typing import Optional, List
import re

VALID_TIPOS = {"manual", "pomodoro"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class SessionCreateRequest(BaseModel):
    subjectId: str
    data: str                         # "YYYY-MM-DD"
    duracaoMinutos: int
    foco: int
    humor: Optional[int] = None
    notas: str = ""
    tipo: str = "manual"

    @field_validator("subjectId")
    @classmethod
    def validate_subject(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("subjectId não pode estar vazio")
        return v.strip()

    @field_validator("data")
    @classmethod
    def validate_data(cls, v: str) -> str:
        if not DATE_RE.match(v):
            raise ValueError("data deve estar no formato YYYY-MM-DD")
        return v

    @field_validator("duracaoMinutos")
    @classmethod
    def validate_duracao(cls, v: int) -> int:
        if v < 1 or v > 1440:
            raise ValueError("duracaoMinutos deve estar entre 1 e 1440")
        return v

    @field_validator("foco")
    @classmethod
    def validate_foco(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("foco deve estar entre 1 e 5")
        return v

    @field_validator("humor")
    @classmethod
    def validate_humor(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 5):
            raise ValueError("humor deve estar entre 1 e 5")
        return v

    @field_validator("tipo")
    @classmethod
    def validate_tipo(cls, v: str) -> str:
        if v not in VALID_TIPOS:
            raise ValueError("tipo deve ser 'manual' ou 'pomodoro'")
        return v


class SessionUpdateRequest(BaseModel):
    subjectId: Optional[str] = None
    data: Optional[str] = None
    duracaoMinutos: Optional[int] = None
    foco: Optional[int] = None
    humor: Optional[int] = None
    notas: Optional[str] = None
    tipo: Optional[str] = None

    @field_validator("data")
    @classmethod
    def validate_data(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not DATE_RE.match(v):
            raise ValueError("data deve estar no formato YYYY-MM-DD")
        return v

    @field_validator("duracaoMinutos")
    @classmethod
    def validate_duracao(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 1440):
            raise ValueError("duracaoMinutos deve estar entre 1 e 1440")
        return v

    @field_validator("foco")
    @classmethod
    def validate_foco(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 5):
            raise ValueError("foco deve estar entre 1 e 5")
        return v

    @field_validator("humor")
    @classmethod
    def validate_humor(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 5):
            raise ValueError("humor deve estar entre 1 e 5")
        return v

    @field_validator("tipo")
    @classmethod
    def validate_tipo(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_TIPOS:
            raise ValueError("tipo deve ser 'manual' ou 'pomodoro'")
        return v


class SessionResponse(BaseModel):
    id: str
    userId: str
    subjectId: str
    data: str
    duracaoMinutos: int
    foco: int
    humor: Optional[int]
    notas: str
    tipo: str


class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]
    total: int


class SessionStatsResponse(BaseModel):
    totalSessoes: int
    totalMinutos: int
    totalHoras: float
    mediaFoco: float
    mediaHumor: Optional[float]
    minutosPorDisciplina: dict  # subjectId -> minutos
