from pydantic import BaseModel
from typing import Generic, TypeVar, Optional

T = TypeVar("T")


class MessageResponse(BaseModel):
    message: str


class DataResponse(BaseModel, Generic[T]):
    data: T
    message: Optional[str] = None
