from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import auth, modules, progress
from .services.curriculum_loader import load_curriculum


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_curriculum()
    yield


app = FastAPI(
    title="HPC AI Learning Platform",
    description="An interactive learning platform for AI Platform Engineering and HPC",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(modules.router)
app.include_router(progress.router)


@app.get("/")
async def root():
    return {"name": "HPC AI Learning Platform", "version": "1.0.0"}
