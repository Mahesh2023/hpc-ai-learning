"""Application configuration via environment variables.

v3.0 — Production-grade configuration with:
  - Auto-generated secret keys (never ship defaults)
  - Separate access/refresh token settings
  - Strict CORS defaults
"""

import os
import secrets
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("HPCAI_DATA_DIR", str(BASE_DIR / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── Database ───────────────────────────────────────────────────
DATABASE_URL = os.getenv("HPCAI_DATABASE_URL", f"sqlite+aiosqlite:///{DATA_DIR / 'hpcai.db'}")

# ── Auth / JWT ─────────────────────────────────────────────────
# Auto-generate cryptographic keys if not provided (never use a default)
_default_secret = secrets.token_hex(32)
SECRET_KEY = os.getenv("HPCAI_SECRET_KEY", _default_secret)
REFRESH_SECRET_KEY = os.getenv("HPCAI_REFRESH_SECRET_KEY", secrets.token_hex(32))
ALGORITHM = "HS256"

# Short-lived access tokens (OWASP: 5-15 min)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("HPCAI_ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
# Long-lived refresh tokens (rotated on use)
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("HPCAI_REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Token issuer/audience for JWT validation
TOKEN_ISSUER = os.getenv("HPCAI_TOKEN_ISSUER", "hpc-ai-learning")
TOKEN_AUDIENCE = os.getenv("HPCAI_TOKEN_AUDIENCE", "hpc-ai-learning")

# ── CORS ───────────────────────────────────────────────────────
CORS_ORIGINS = os.getenv(
    "HPCAI_CORS_ORIGINS",
    "http://localhost:3000,http://localhost:8080,http://localhost",
).split(",")

# ── Security ───────────────────────────────────────────────────
# Account lockout
MAX_FAILED_LOGIN_ATTEMPTS = int(os.getenv("HPCAI_MAX_FAILED_LOGINS", "5"))
LOCKOUT_DURATION_MINUTES = int(os.getenv("HPCAI_LOCKOUT_MINUTES", "15"))

# Rate limiting
RATE_LIMIT_LOGIN = os.getenv("HPCAI_RATE_LIMIT_LOGIN", "5/minute")
RATE_LIMIT_REGISTER = os.getenv("HPCAI_RATE_LIMIT_REGISTER", "3/minute")
RATE_LIMIT_GLOBAL = os.getenv("HPCAI_RATE_LIMIT_GLOBAL", "60/minute")

# Environment
ENVIRONMENT = os.getenv("HPCAI_ENVIRONMENT", "development")

# ── Sandbox / Code Runner ─────────────────────────────────────
SANDBOX_ENABLED = os.getenv("HPCAI_SANDBOX_ENABLED", "true").lower() == "true"
SANDBOX_TIMEOUT = int(os.getenv("HPCAI_SANDBOX_TIMEOUT", "30"))
SANDBOX_MAX_OUTPUT = int(os.getenv("HPCAI_SANDBOX_MAX_OUTPUT", "65536"))

# ── Terminal ───────────────────────────────────────────────────
TERMINAL_ENABLED = os.getenv("HPCAI_TERMINAL_ENABLED", "true").lower() == "true"
TERMINAL_SHELL = os.getenv("HPCAI_TERMINAL_SHELL", "/bin/bash")
TERMINAL_ROWS = int(os.getenv("HPCAI_TERMINAL_ROWS", "24"))
TERMINAL_COLS = int(os.getenv("HPCAI_TERMINAL_COLS", "80"))

# ── Curriculum ─────────────────────────────────────────────────
CURRICULUM_DIR = Path(os.getenv(
    "HPCAI_CURRICULUM_DIR",
    str(Path(__file__).resolve().parent / "curriculum"),
))
