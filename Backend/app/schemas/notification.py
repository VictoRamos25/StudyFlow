"""
Schemas de notificação.
"""
from pydantic import BaseModel


class WeeklyWrappedResponse(BaseModel):
    sent: bool
    message: str
