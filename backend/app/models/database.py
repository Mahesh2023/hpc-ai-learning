"""Persistent storage with SQLAlchemy + SQLite."""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any, Optional

from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, String, Integer, Float, Text
from sqlalchemy.orm import declarative_base, sessionmaker

from ..config import DATABASE_URL

# Handle async URL variants for sync engine
_sync_url = DATABASE_URL.replace("+aiosqlite", "")

engine = create_engine(_sync_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── ORM Models ──────────────────────────────────────────────────────────

class UserModel(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    username = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    level = Column(String, default="beginner")
    created_at = Column(String)


class ProgressModel(Base):
    __tablename__ = "progress"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    module_id = Column(String, nullable=False)
    lessons_completed = Column(Text, default="[]")     # JSON array
    exercises_completed = Column(Text, default="[]")   # JSON array
    score = Column(Integer, default=0)
    started_at = Column(String)
    updated_at = Column(String)
    completion_pct = Column(Float, default=0.0)


class SubmissionModel(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    exercise_id = Column(String, nullable=False)
    answer = Column(Text)
    code = Column(Text)
    correct = Column(Integer, default=0)
    score = Column(Integer, default=0)
    feedback = Column(Text)
    submitted_at = Column(String)


# ── Helpers ──────────────────────────────────────────────────────────────

def _json_load(val: str | None) -> list:
    if not val:
        return []
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return []


def _user_dict(u: UserModel) -> dict[str, Any]:
    return {
        "id": u.id, "username": u.username, "email": u.email,
        "password_hash": u.password_hash, "level": u.level,
        "created_at": u.created_at or "",
    }


def _progress_dict(p: ProgressModel) -> dict[str, Any]:
    return {
        "user_id": p.user_id, "module_id": p.module_id,
        "lessons_completed": _json_load(p.lessons_completed),
        "exercises_completed": _json_load(p.exercises_completed),
        "score": p.score, "started_at": p.started_at or "",
        "updated_at": p.updated_at or "", "completion_pct": p.completion_pct,
    }


# ── Public API (same signatures as the old in-memory store) ─────────────

def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def create_user(username: str, email: str, password: str) -> dict[str, Any]:
    db = SessionLocal()
    try:
        if db.query(UserModel).filter(UserModel.email == email).first():
            raise ValueError("Email already registered")
        user = UserModel(
            id=uuid.uuid4().hex[:12],
            username=username, email=email,
            password_hash=pwd_ctx.hash(password),
            level="beginner",
            created_at=datetime.utcnow().isoformat(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return _user_dict(user)
    finally:
        db.close()


def get_user_by_email(email: str) -> Optional[dict[str, Any]]:
    db = SessionLocal()
    try:
        u = db.query(UserModel).filter(UserModel.email == email).first()
        return _user_dict(u) if u else None
    finally:
        db.close()


def get_user_by_id(uid: str) -> Optional[dict[str, Any]]:
    db = SessionLocal()
    try:
        u = db.query(UserModel).filter(UserModel.id == uid).first()
        return _user_dict(u) if u else None
    finally:
        db.close()


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def save_progress(user_id: str, module_id: str, data: dict[str, Any]) -> dict[str, Any]:
    db = SessionLocal()
    try:
        prog = db.query(ProgressModel).filter(
            ProgressModel.user_id == user_id,
            ProgressModel.module_id == module_id,
        ).first()

        if not prog:
            prog = ProgressModel(
                user_id=user_id, module_id=module_id,
                lessons_completed="[]", exercises_completed="[]",
                score=0, started_at=datetime.utcnow().isoformat(),
            )
            db.add(prog)

        for key, val in data.items():
            if key in ("lessons_completed", "exercises_completed"):
                setattr(prog, key, json.dumps(val))
            elif hasattr(prog, key):
                setattr(prog, key, val)
        prog.updated_at = datetime.utcnow().isoformat()
        db.commit()
        db.refresh(prog)
        return _progress_dict(prog)
    finally:
        db.close()


def get_progress(user_id: str, module_id: Optional[str] = None) -> Any:
    db = SessionLocal()
    try:
        if module_id:
            p = db.query(ProgressModel).filter(
                ProgressModel.user_id == user_id,
                ProgressModel.module_id == module_id,
            ).first()
            return _progress_dict(p) if p else None
        rows = db.query(ProgressModel).filter(ProgressModel.user_id == user_id).all()
        return {p.module_id: _progress_dict(p) for p in rows}
    finally:
        db.close()


def get_all_progress(user_id: str) -> dict[str, dict[str, Any]]:
    db = SessionLocal()
    try:
        rows = db.query(ProgressModel).filter(ProgressModel.user_id == user_id).all()
        return {p.module_id: _progress_dict(p) for p in rows}
    finally:
        db.close()


def save_submission(user_id: str, exercise_id: str, answer: str,
                    code: str | None, correct: bool, score: int, feedback: str) -> None:
    db = SessionLocal()
    try:
        db.add(SubmissionModel(
            user_id=user_id, exercise_id=exercise_id,
            answer=answer, code=code,
            correct=int(correct), score=score, feedback=feedback,
            submitted_at=datetime.utcnow().isoformat(),
        ))
        db.commit()
    finally:
        db.close()
