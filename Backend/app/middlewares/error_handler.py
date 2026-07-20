import logging

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import ValidationError

from app.utils.exceptions import (
    StudyFlowException, BadRequestException,
    UnauthorizedException, NotFoundException, ConflictException,
)

logger = logging.getLogger(__name__)

_STATUS_MAP = {
    BadRequestException:   status.HTTP_400_BAD_REQUEST,
    UnauthorizedException: status.HTTP_401_UNAUTHORIZED,
    NotFoundException:     status.HTTP_404_NOT_FOUND,
    ConflictException:     status.HTTP_409_CONFLICT,
}


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except StudyFlowException as exc:
            code = _STATUS_MAP.get(type(exc), status.HTTP_400_BAD_REQUEST)
            return JSONResponse(status_code=code, content={"detail": str(exc)})
        except ValidationError as exc:
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"detail": exc.errors()},
            )
        except Exception:
            logger.exception("Unhandled exception on %s %s", request.method, request.url)
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Erro interno do servidor"},
            )
