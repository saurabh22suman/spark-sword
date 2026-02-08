"""FastAPI application entry point."""

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import (
    analysis_router,
    scenarios_router,
    tutorials_router,
    progress_router,
    feedback_router,
    auth_router,
)
from app.api.expert import router as expert_router

app = FastAPI(
    title="PrepRabbit",
    description="Spark Internals Explorer - Explain, Simulate, Suggest",
    version="0.1.0",
    # Disable docs in production for security
    docs_url="/docs" if os.getenv("DEBUG", "false").lower() == "true" else None,
    redoc_url="/redoc" if os.getenv("DEBUG", "false").lower() == "true" else None,
)

# Configure CORS for frontend - use environment variable for flexibility
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # Only methods we actually use
    allow_headers=["Content-Type", "Accept"],  # Only headers we need
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Include API routers
app.include_router(auth_router)
app.include_router(analysis_router)
app.include_router(scenarios_router)
app.include_router(tutorials_router)
app.include_router(progress_router)
app.include_router(feedback_router)
app.include_router(expert_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}
