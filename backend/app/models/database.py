"""In-memory data store for users and progress."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Storage ──
_users: dict[str, dict[str, Any]] = {}  # id -> user dict
_email_index: dict[str, str] = {}  # email -> id
_progress: dict[str, dict[str, dict[str, Any]]] = {}  # user_id -> module_id -> progress
_sessions: dict[str, str] = {}  # token_jti -> user_id


def create_user(username: str, email: str, password: str) -> dict[str, Any]:
    if email in _email_index:
        raise ValueError("Email already registered")
    uid = uuid.uuid4().hex[:12]
    user = {
        "id": uid,
        "username": username,
        "email": email,
        "password_hash": pwd_ctx.hash(password),
        "level": "beginner",
        "created_at": datetime.utcnow().isoformat(),
    }
    _users[uid] = user
    _email_index[email] = uid
    return user


def get_user_by_email(email: str) -> Optional[dict[str, Any]]:
    uid = _email_index.get(email)
    return _users.get(uid) if uid else None


def get_user_by_id(uid: str) -> Optional[dict[str, Any]]:
    return _users.get(uid)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def save_progress(user_id: str, module_id: str, data: dict[str, Any]) -> dict[str, Any]:
    if user_id not in _progress:
        _progress[user_id] = {}
    if module_id not in _progress[user_id]:
        _progress[user_id][module_id] = {
            "user_id": user_id,
            "module_id": module_id,
            "lessons_completed": [],
            "exercises_completed": [],
            "score": 0,
            "started_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "completion_pct": 0.0,
        }
    entry = _progress[user_id][module_id]
    entry.update(data)
    entry["updated_at"] = datetime.utcnow().isoformat()
    return entry


def get_progress(user_id: str, module_id: Optional[str] = None) -> Any:
    user_prog = _progress.get(user_id, {})
    if module_id:
        return user_prog.get(module_id)
    return user_prog


def get_all_progress(user_id: str) -> dict[str, dict[str, Any]]:
    return _progress.get(user_id, {})
