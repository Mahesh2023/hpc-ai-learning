"""Application configuration via environment variables."""

import os
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("HPCAI_DATA_DIR", str(BASE_DIR / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── Database ───────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("HPCAI_DATABASE_URL", f"sqlite+aiosqlite:///{DATA_DIR / 'hpcai.db'}")

# ── Auth / JWT ─────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("HPCAI_SECRET_KEY", "change-me-in-production-use-openssl-rand-hex-32")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("HPCAI_TOKEN_EXPIRE_MINUTES", "1440"))

# ── CORS ───────────────────────────────────────────────────────────────
CORS_ORIGINS = os.getenv(
    "HPCAI_CORS_ORIGINS",
    "http://localhost:3000,http://localhost:8080,http://localhost",
).split(",")

# ── Sandbox / Code Runner ─────────────────────────────────────────────
SANDBOX_ENABLED = os.getenv("HPCAI_SANDBOX_ENABLED", "true").lower() == "true"
SANDBOX_TIMEOUT = int(os.getenv("HPCAI_SANDBOX_TIMEOUT", "30"))
SANDBOX_MAX_OUTPUT = int(os.getenv("HPCAI_SANDBOX_MAX_OUTPUT", "65536"))

# ── Terminal ───────────────────────────────────────────────────────────
TERMINAL_ENABLED = os.getenv("HPCAI_TERMINAL_ENABLED", "true").lower() == "true"
TERMINAL_SHELL = os.getenv("HPCAI_TERMINAL_SHELL", "/bin/bash")
TERMINAL_ROWS = int(os.getenv("HPCAI_TERMINAL_ROWS", "24"))
TERMINAL_COLS = int(os.getenv("HPCAI_TERMINAL_COLS", "80"))

# ── Curriculum ─────────────────────────────────────────────────────────
CURRICULUM_DIR = Path(os.getenv(
    "HPCAI_CURRICULUM_DIR",
    str(Path(__file__).resolve().parent / "curriculum"),
))
