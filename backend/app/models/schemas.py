from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Auth ──

class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    level: str = "beginner"
    created_at: str = ""


# ── Curriculum ──

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


# ── Progress ──

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
