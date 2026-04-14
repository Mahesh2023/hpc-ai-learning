from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .models.database import init_db
from .routes import auth, modules, progress, sandbox, terminal
from .services.curriculum_loader import load_curriculum


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    load_curriculum()
    yield


app = FastAPI(
    title="HPC AI Learning Platform",
    description="An interactive learning platform for AI Platform Engineering and HPC",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(modules.router)
app.include_router(progress.router)
app.include_router(sandbox.router)
app.include_router(terminal.router)


@app.get("/")
async def root():
    return {"name": "HPC AI Learning Platform", "version": "2.0.0", "status": "running"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
