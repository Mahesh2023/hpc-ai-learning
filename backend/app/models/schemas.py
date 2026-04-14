"""Pydantic schemas with production-grade validation.

v3.0 — Features:
  - Email validation via pydantic[email]
  - Password policy enforcement (NIST 800-63B compliant)
  - Username validation (length, characters)
  - Strict input schemas for all auth endpoints
  - Response schemas that never leak sensitive data
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, EmailStr


# ── Password Policy (NIST 800-63B) ────────────────────────────

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128


def _validate_password(v: str) -> str:
    if len(v) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    if len(v) > MAX_PASSWORD_LENGTH:
        raise ValueError(f"Password must not exceed {MAX_PASSWORD_LENGTH} characters")
    return v


# ── Auth Request Schemas ───────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Username may only contain letters, numbers, hyphens, and underscores")
        return v.strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)
    totp_code: Optional[str] = Field(None, min_length=6, max_length=8)
    remember_me: bool = False

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 900  # seconds
    requires_2fa: bool = False


class Token(BaseModel):
    """Legacy compat — kept for any code referencing old Token schema."""
    access_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """Body is empty — refresh token comes from HttpOnly cookie."""
    pass


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return _validate_password(v)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=200)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return _validate_password(v)


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=200)


class Enable2FAResponse(BaseModel):
    secret: str
    qr_uri: str
    qr_code_base64: str


class Verify2FARequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=8)


class Verify2FAResponse(BaseModel):
    success: bool
    recovery_codes: list[str] = []


class Disable2FARequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=128)
    code: str = Field(..., min_length=6, max_length=8)


class RecoveryCodeLoginRequest(BaseModel):
    email: EmailStr
    recovery_code: str = Field(..., min_length=4, max_length=20)


# ── Auth Response Schemas ──────────────────────────────────────

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    role: str = "learner"
    level: str = "beginner"
    email_verified: bool = False
    totp_enabled: bool = False
    created_at: str = ""
    last_login_at: str = ""


class SessionOut(BaseModel):
    id: str
    device_info: str = ""
    ip_address: str = ""
    created_at: str = ""
    last_used_at: str = ""


class SessionListResponse(BaseModel):
    sessions: list[SessionOut] = []


# ── Password Strength (returned to frontend) ──────────────────

class PasswordStrengthResponse(BaseModel):
    score: int = Field(..., ge=0, le=4)  # 0=very weak, 4=very strong
    feedback: str = ""
    suggestions: list[str] = []


# ── Curriculum ─────────────────────────────────────────────────

class Exercise(BaseModel):
    id: str
    title: str
    description: str
    exercise_type: str  # quiz / coding / lab / project
    difficulty: int = 1
    hints: list[str] = []
    solution: str = ""
    options: list[str] = []
    correct_answer: str = ""
    test_cases: list[dict[str, Any]] = []
    starter_code: str = ""


class Lesson(BaseModel):
    id: str
    title: str
    content_md: str = ""
    order: int = 0
    objectives: list[str] = []
    exercises: list[Exercise] = []


class LessonSummary(BaseModel):
    id: str
    title: str
    order: int = 0
    objectives: list[str] = []
    exercise_count: int = 0


class Module(BaseModel):
    id: str
    title: str
    description: str
    level: str  # beginner / intermediate / advanced / professional
    order: int = 0
    estimated_hours: int = 0
    prerequisites: list[str] = []
    skills: list[str] = []
    lessons: list[Lesson] = []


class ModuleSummary(BaseModel):
    id: str
    title: str
    description: str
    level: str
    order: int = 0
    estimated_hours: int = 0
    prerequisites: list[str] = []
    skills: list[str] = []
    lesson_count: int = 0


# ── Progress ───────────────────────────────────────────────────

class ExerciseSubmission(BaseModel):
    exercise_id: str
    answer: str
    code: Optional[str] = None


class ExerciseResult(BaseModel):
    correct: bool
    feedback: str
    score: int = 0
    next_hint: Optional[str] = None


class UserProgress(BaseModel):
    user_id: str
    module_id: str
    lessons_completed: list[str] = []
    exercises_completed: list[str] = []
    score: int = 0
    started_at: str = ""
    updated_at: str = ""
    completion_pct: float = 0.0


class DashboardStats(BaseModel):
    total_modules: int = 0
    completed_modules: int = 0
    current_level: str = "beginner"
    total_score: int = 0
    streak_days: int = 0
    skills: dict[str, int] = {}


class LearningPathModule(BaseModel):
    module_id: str
    title: str
    level: str
    order: int
    status: str  # locked / available / in_progress / completed
    completion_pct: float = 0.0


class LearningPath(BaseModel):
    modules: list[LearningPathModule] = []
