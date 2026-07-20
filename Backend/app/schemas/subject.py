from pydantic import BaseModel, field_validator
from typing import Optional, List
import re


VALID_PRIORITIES = {"baixa", "media", "alta"}
HEX_RE = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


class SubjectCreateRequest(BaseModel):
    nome: str
    creditos: int = 0
    prioridade: str = "media"
    objetivoSemanalHoras: float = 0.0
    cor: str = "#7EB8F7"

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("O nome da disciplina não pode estar vazio")
        if len(v) > 100:
            raise ValueError("O nome não pode ter mais de 100 caracteres")
        return v

    @field_validator("prioridade")
    @classmethod
    def validate_prioridade(cls, v: str) -> str:
        if v not in VALID_PRIORITIES:
            raise ValueError("Prioridade deve ser: baixa, media ou alta")
        return v

    @field_validator("creditos")
    @classmethod
    def validate_creditos(cls, v: int) -> int:
        if v < 0 or v > 30:
            raise ValueError("Créditos devem estar entre 0 e 30")
        return v

    @field_validator("objetivoSemanalHoras")
    @classmethod
    def validate_objetivo(cls, v: float) -> float:
        if v < 0 or v > 168:
            raise ValueError("Objetivo semanal deve estar entre 0 e 168 horas")
        return v

    @field_validator("cor")
    @classmethod
    def validate_cor(cls, v: str) -> str:
        if not HEX_RE.match(v):
            raise ValueError("Cor deve ser um valor hexadecimal válido (ex: #7EB8F7)")
        return v


class SubjectUpdateRequest(BaseModel):
    nome: Optional[str] = None
    creditos: Optional[int] = None
    prioridade: Optional[str] = None
    objetivoSemanalHoras: Optional[float] = None
    cor: Optional[str] = None

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("O nome não pode estar vazio")
            if len(v) > 100:
                raise ValueError("O nome não pode ter mais de 100 caracteres")
        return v

    @field_validator("prioridade")
    @classmethod
    def validate_prioridade(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_PRIORITIES:
            raise ValueError("Prioridade deve ser: baixa, media ou alta")
        return v

    @field_validator("creditos")
    @classmethod
    def validate_creditos(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 0 or v > 30):
            raise ValueError("Créditos devem estar entre 0 e 30")
        return v

    @field_validator("cor")
    @classmethod
    def validate_cor(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not HEX_RE.match(v):
            raise ValueError("Cor deve ser um valor hexadecimal válido")
        return v


class SubjectResponse(BaseModel):
    id: str
    userId: str
    nome: str
    creditos: int
    prioridade: str
    objetivoSemanalHoras: float
    cor: str


class SubjectListResponse(BaseModel):
    subjects: List[SubjectResponse]
    total: int
