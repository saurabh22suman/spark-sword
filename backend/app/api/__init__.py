"""FastAPI route modules."""

from app.api.analysis import router as analysis_router
from app.api.scenarios import router as scenarios_router

__all__ = ["analysis_router", "scenarios_router"]
