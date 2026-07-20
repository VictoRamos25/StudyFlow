from pydantic import BaseModel
from typing import Optional


class UserResponse(BaseModel):
    uid: str
    nome: str
    email: str
    username: str
    curso: Optional[str] = None
    fotoURL: Optional[str] = None
    pomodoroMinutes: int = 25
