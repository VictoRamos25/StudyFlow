from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, subjects, sessions, exams, ai
from app.routers.export_router import router as export_router
from app.routers.notification_router import router as notification_router
from app.middlewares.error_handler import ErrorHandlerMiddleware

app = FastAPI(
    title=settings.APP_NAME,
    description="API backend da aplicação StudyFlow",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,             prefix="/auth",          tags=["Authentication"])
app.include_router(subjects.router,         prefix="/subjects",      tags=["Subjects"])
app.include_router(sessions.router,         prefix="/sessions",      tags=["Sessions"])
app.include_router(exams.router,            prefix="/exams",         tags=["Exams"])
app.include_router(ai.router,               prefix="/ai",            tags=["AI Agent"])
app.include_router(export_router,           prefix="/export",        tags=["Export"])
app.include_router(notification_router,     prefix="/notifications", tags=["Notifications"])


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}