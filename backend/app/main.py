"""HPC AI Learning Platform — Main application.

v3.0 — Production-grade with:
  - Security headers middleware
  - Rate limiting
  - Hardened CORS
  - All auth routes
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import CORS_ORIGINS
from .models.database import init_db
from .routes import auth, modules, progress, sandbox, terminal
from .services.curriculum_loader import load_curriculum
from .middleware.security import SecurityHeadersMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    load_curriculum()
    yield


app = FastAPI(
    title="HPC AI Learning Platform",
    description="An interactive learning platform for AI Platform Engineering and HPC",
    version="3.0.0",
    lifespan=lifespan,
)

# ── Middleware (order matters: last added = first executed) ──────

# Security headers (runs on every response)
app.add_middleware(SecurityHeadersMiddleware)

# CORS — explicit origins, credentials support
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)


# ── Global exception handler (prevent stack trace leaks) ────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ── Routes ──────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(modules.router)
app.include_router(progress.router)
app.include_router(sandbox.router)
app.include_router(terminal.router)


@app.get("/")
async def root():
    return {"name": "HPC AI Learning Platform", "version": "3.0.0", "status": "running"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
