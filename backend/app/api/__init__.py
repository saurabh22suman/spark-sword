"""FastAPI route modules."""

from app.api.analysis import router as analysis_router
from app.api.scenarios import router as scenarios_router
from app.api.tutorials import router as tutorials_router
from app.api.progress import router as progress_router
from app.api.feedback import router as feedback_router
from app.api.auth import router as auth_router

__all__ = [
    "analysis_router",
    "scenarios_router",
    "tutorials_router",
    "progress_router",
    "feedback_router",
    "auth_router",
]
