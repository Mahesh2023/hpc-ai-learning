"""Persistent storage with SQLAlchemy + SQLite.

v3.0 — Production-grade models with:
  - Argon2id password hashing (OWASP #1 recommendation)
  - Account lockout tracking (failed_attempts, locked_until)
  - Email verification support
  - TOTP 2FA support
  - Role-based access control
  - Session management (refresh tokens)
  - Audit logging
  - Token blacklist for JWT revocation
"""

from __future__ import annotations

import json
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Any, Optional

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, String, Integer, Float, Text, Boolean, DateTime, Index
from sqlalchemy.orm import declarative_base, sessionmaker

from ..config import DATABASE_URL

# Handle async URL variants for sync engine
_sync_url = DATABASE_URL.replace("+aiosqlite", "")

engine = create_engine(_sync_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# ── Password Hashing ────────────────────────────────────────────────────
# Primary: Argon2id (OWASP recommended, PHC winner)
# Fallback: bcrypt for migrating legacy hashes
_argon2 = PasswordHasher(
    time_cost=2,          # iterations
    memory_cost=19456,    # 19 MiB (OWASP minimum)
    parallelism=1,
    hash_len=32,
    salt_len=16,
)
_legacy_bcrypt = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash password with Argon2id."""
    return _argon2.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify password against Argon2id or legacy bcrypt hash."""
    if hashed.startswith("$argon2"):
        try:
            return _argon2.verify(hashed, plain)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False
    # Legacy bcrypt hash — verify and flag for rehash
    return _legacy_bcrypt.verify(plain, hashed)


def needs_rehash(hashed: str) -> bool:
    """Check if hash should be upgraded (bcrypt → argon2id or params changed)."""
    if not hashed.startswith("$argon2"):
        return True  # Legacy bcrypt → needs Argon2id upgrade
    return _argon2.check_needs_rehash(hashed)


# ── ORM Models ──────────────────────────────────────────────────────────

class UserModel(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: uuid.uuid4().hex)
    username = Column(String(64), nullable=False)
    email = Column(String(254), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(20), default="learner")  # learner, instructor, admin
    level = Column(String(20), default="beginner")
    # Email verification
    email_verified = Column(Boolean, default=False)
    email_verify_token = Column(String(128), nullable=True)
    email_verify_expires = Column(String(32), nullable=True)
    # Account lockout (OWASP: brute-force protection)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(String(32), nullable=True)
    last_failed_login = Column(String(32), nullable=True)
    # TOTP 2FA
    totp_secret = Column(String(64), nullable=True)
    totp_enabled = Column(Boolean, default=False)
    recovery_codes = Column(Text, nullable=True)  # JSON array of hashed codes
    # Password management
    password_changed_at = Column(String(32), nullable=True)
    must_change_password = Column(Boolean, default=False)
    # Timestamps
    created_at = Column(String(32))
    updated_at = Column(String(32))
    last_login_at = Column(String(32), nullable=True)
    last_login_ip = Column(String(45), nullable=True)


class SessionModel(Base):
    """Tracks refresh tokens / active sessions for users."""
    __tablename__ = "sessions"
    id = Column(String(36), primary_key=True, default=lambda: uuid.uuid4().hex)
    user_id = Column(String(36), nullable=False, index=True)
    refresh_token_hash = Column(String(256), nullable=False)
    device_info = Column(String(512), nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(String(32))
    expires_at = Column(String(32))
    last_used_at = Column(String(32), nullable=True)
    revoked = Column(Boolean, default=False)


class TokenBlacklistModel(Base):
    """Blacklisted JWTs (revoked before expiry)."""
    __tablename__ = "token_blacklist"
    jti = Column(String(36), primary_key=True)
    user_id = Column(String(36), nullable=False, index=True)
    expires_at = Column(String(32))
    blacklisted_at = Column(String(32))


class AuditLogModel(Base):
    """Security audit trail — OWASP logging requirement."""
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), nullable=True, index=True)
    action = Column(String(64), nullable=False)  # login, logout, register, password_change, etc.
    status = Column(String(20), nullable=False)   # success, failure, blocked
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(String(32))

    __table_args__ = (
        Index("ix_audit_action_ts", "action", "timestamp"),
    )


class ProgressModel(Base):
    __tablename__ = "progress"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), nullable=False, index=True)
    module_id = Column(String, nullable=False)
    lessons_completed = Column(Text, default="[]")
    exercises_completed = Column(Text, default="[]")
    score = Column(Integer, default=0)
    started_at = Column(String)
    updated_at = Column(String)
    completion_pct = Column(Float, default=0.0)


class SubmissionModel(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), nullable=False, index=True)
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


def _now() -> str:
    return datetime.utcnow().isoformat()


def _user_dict(u: UserModel, include_sensitive: bool = False) -> dict[str, Any]:
    """Convert user model to dict. Never includes password_hash by default."""
    d = {
        "id": u.id, "username": u.username, "email": u.email,
        "role": u.role or "learner", "level": u.level or "beginner",
        "email_verified": bool(u.email_verified),
        "totp_enabled": bool(u.totp_enabled),
        "created_at": u.created_at or "",
        "last_login_at": u.last_login_at or "",
    }
    if include_sensitive:
        d["password_hash"] = u.password_hash
        d["failed_login_attempts"] = u.failed_login_attempts or 0
        d["locked_until"] = u.locked_until
        d["totp_secret"] = u.totp_secret
        d["recovery_codes"] = u.recovery_codes
        d["must_change_password"] = bool(u.must_change_password)
    return d


def _progress_dict(p: ProgressModel) -> dict[str, Any]:
    return {
        "user_id": p.user_id, "module_id": p.module_id,
        "lessons_completed": _json_load(p.lessons_completed),
        "exercises_completed": _json_load(p.exercises_completed),
        "score": p.score, "started_at": p.started_at or "",
        "updated_at": p.updated_at or "", "completion_pct": p.completion_pct,
    }


# ── Public API ───────────────────────────────────────────────────────────

def init_db() -> None:
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass  # Another worker already created the tables


# ── User CRUD ────────────────────────────────────────────────────────────

def create_user(username: str, email: str, password: str) -> dict[str, Any]:
    db = SessionLocal()
    try:
        if db.query(UserModel).filter(UserModel.email == email).first():
            raise ValueError("Email already registered")
        if db.query(UserModel).filter(UserModel.username == username).first():
            raise ValueError("Username already taken")
        now = _now()
        verify_token = secrets.token_urlsafe(48)
        user = UserModel(
            id=uuid.uuid4().hex,
            username=username, email=email,
            password_hash=hash_password(password),
            role="learner", level="beginner",
            email_verified=False,
            email_verify_token=verify_token,
            email_verify_expires=(datetime.utcnow() + timedelta(hours=24)).isoformat(),
            failed_login_attempts=0,
            password_changed_at=now,
            created_at=now, updated_at=now,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return _user_dict(user)
    finally:
        db.close()


def get_user_by_email(email: str, sensitive: bool = False) -> Optional[dict[str, Any]]:
    db = SessionLocal()
    try:
        u = db.query(UserModel).filter(UserModel.email == email).first()
        return _user_dict(u, include_sensitive=sensitive) if u else None
    finally:
        db.close()


def get_user_by_id(uid: str, sensitive: bool = False) -> Optional[dict[str, Any]]:
    db = SessionLocal()
    try:
        u = db.query(UserModel).filter(UserModel.id == uid).first()
        return _user_dict(u, include_sensitive=sensitive) if u else None
    finally:
        db.close()


def update_user(uid: str, **fields) -> Optional[dict[str, Any]]:
    db = SessionLocal()
    try:
        u = db.query(UserModel).filter(UserModel.id == uid).first()
        if not u:
            return None
        for k, v in fields.items():
            if hasattr(u, k):
                setattr(u, k, v)
        u.updated_at = _now()
        db.commit()
        db.refresh(u)
        return _user_dict(u)
    finally:
        db.close()


# ── Account lockout ──────────────────────────────────────────────────────

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15


def record_failed_login(email: str) -> None:
    """Increment failed login counter; lock account after MAX_FAILED_ATTEMPTS."""
    db = SessionLocal()
    try:
        u = db.query(UserModel).filter(UserModel.email == email).first()
        if not u:
            return
        u.failed_login_attempts = (u.failed_login_attempts or 0) + 1
        u.last_failed_login = _now()
        if u.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            u.locked_until = (datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)).isoformat()
        db.commit()
    finally:
        db.close()


def reset_failed_logins(email: str) -> None:
    db = SessionLocal()
    try:
        u = db.query(UserModel).filter(UserModel.email == email).first()
        if u:
            u.failed_login_attempts = 0
            u.locked_until = None
            db.commit()
    finally:
        db.close()


def is_account_locked(email: str) -> bool:
    db = SessionLocal()
    try:
        u = db.query(UserModel).filter(UserModel.email == email).first()
        if not u or not u.locked_until:
            return False
        locked = datetime.fromisoformat(u.locked_until)
        if datetime.utcnow() < locked:
            return True
        # Lock expired — reset
        u.failed_login_attempts = 0
        u.locked_until = None
        db.commit()
        return False
    finally:
        db.close()


def update_last_login(uid: str, ip: str) -> None:
    db = SessionLocal()
    try:
        u = db.query(UserModel).filter(UserModel.id == uid).first()
        if u:
            u.last_login_at = _now()
            u.last_login_ip = ip
            db.commit()
    finally:
        db.close()


# ── Email verification ───────────────────────────────────────────────────

def verify_email_token(token: str) -> Optional[str]:
    """Verify email token, return user_id or None."""
    db = SessionLocal()
    try:
        u = db.query(UserModel).filter(UserModel.email_verify_token == token).first()
        if not u:
            return None
        if u.email_verify_expires:
            expires = datetime.fromisoformat(u.email_verify_expires)
            if datetime.utcnow() > expires:
                return None
        u.email_verified = True
        u.email_verify_token = None
        u.email_verify_expires = None
        db.commit()
        return u.id
    finally:
        db.close()


# ── TOTP 2FA ─────────────────────────────────────────────────────────────

def enable_totp(uid: str, secret: str) -> bool:
    db = SessionLocal()
    try:
        u = db.query(UserModel).filter(UserModel.id == uid).first()
        if not u:
            return False
        u.totp_secret = secret
        u.totp_enabled = True
        # Generate 8 recovery codes
        codes = [secrets.token_hex(4) for _ in range(8)]
        u.recovery_codes = json.dumps([hash_password(c) for c in codes])
        db.commit()
        return True
    finally:
        db.close()


def disable_totp(uid: str) -> bool:
    db = SessionLocal()
    try:
        u = db.query(UserModel).filter(UserModel.id == uid).first()
        if not u:
            return False
        u.totp_secret = None
        u.totp_enabled = False
        u.recovery_codes = None
        db.commit()
        return True
    finally:
        db.close()


def use_recovery_code(uid: str, code: str) -> bool:
    """Validate and consume a recovery code."""
    db = SessionLocal()
    try:
        u = db.query(UserModel).filter(UserModel.id == uid).first()
        if not u or not u.recovery_codes:
            return False
        codes = json.loads(u.recovery_codes)
        for i, hashed_code in enumerate(codes):
            if verify_password(code, hashed_code):
                codes.pop(i)
                u.recovery_codes = json.dumps(codes)
                db.commit()
                return True
        return False
    finally:
        db.close()


# ── Session management ───────────────────────────────────────────────────

def create_session(user_id: str, refresh_token_hash: str,
                   device_info: str = "", ip: str = "",
                   expires_days: int = 30) -> str:
    db = SessionLocal()
    try:
        session = SessionModel(
            id=uuid.uuid4().hex,
            user_id=user_id,
            refresh_token_hash=refresh_token_hash,
            device_info=device_info,
            ip_address=ip,
            created_at=_now(),
            expires_at=(datetime.utcnow() + timedelta(days=expires_days)).isoformat(),
            last_used_at=_now(),
        )
        db.add(session)
        db.commit()
        return session.id
    finally:
        db.close()


def get_user_sessions(user_id: str) -> list[dict]:
    db = SessionLocal()
    try:
        rows = db.query(SessionModel).filter(
            SessionModel.user_id == user_id,
            SessionModel.revoked == False,
        ).all()
        return [{
            "id": s.id, "device_info": s.device_info or "",
            "ip_address": s.ip_address or "",
            "created_at": s.created_at, "last_used_at": s.last_used_at or "",
        } for s in rows]
    finally:
        db.close()


def revoke_session(session_id: str, user_id: str) -> bool:
    db = SessionLocal()
    try:
        s = db.query(SessionModel).filter(
            SessionModel.id == session_id,
            SessionModel.user_id == user_id,
        ).first()
        if not s:
            return False
        s.revoked = True
        db.commit()
        return True
    finally:
        db.close()


def revoke_all_sessions(user_id: str, except_session_id: str = None) -> int:
    db = SessionLocal()
    try:
        q = db.query(SessionModel).filter(
            SessionModel.user_id == user_id,
            SessionModel.revoked == False,
        )
        if except_session_id:
            q = q.filter(SessionModel.id != except_session_id)
        count = q.update({"revoked": True})
        db.commit()
        return count
    finally:
        db.close()


def validate_refresh_token(refresh_token_hash: str) -> Optional[dict]:
    """Find active session by refresh token hash."""
    db = SessionLocal()
    try:
        s = db.query(SessionModel).filter(
            SessionModel.refresh_token_hash == refresh_token_hash,
            SessionModel.revoked == False,
        ).first()
        if not s:
            return None
        if s.expires_at and datetime.utcnow() > datetime.fromisoformat(s.expires_at):
            s.revoked = True
            db.commit()
            return None
        s.last_used_at = _now()
        db.commit()
        return {"session_id": s.id, "user_id": s.user_id}
    finally:
        db.close()


# ── Token blacklist ──────────────────────────────────────────────────────

def blacklist_token(jti: str, user_id: str, expires_at: str) -> None:
    db = SessionLocal()
    try:
        db.add(TokenBlacklistModel(
            jti=jti, user_id=user_id,
            expires_at=expires_at, blacklisted_at=_now(),
        ))
        db.commit()
    except Exception:
        pass  # Already blacklisted
    finally:
        db.close()


def is_token_blacklisted(jti: str) -> bool:
    db = SessionLocal()
    try:
        return db.query(TokenBlacklistModel).filter(
            TokenBlacklistModel.jti == jti
        ).first() is not None
    finally:
        db.close()


def cleanup_expired_blacklist() -> int:
    """Remove expired entries from blacklist."""
    db = SessionLocal()
    try:
        now = _now()
        count = db.query(TokenBlacklistModel).filter(
            TokenBlacklistModel.expires_at < now
        ).delete()
        db.commit()
        return count
    finally:
        db.close()


# ── Audit logging ────────────────────────────────────────────────────────

def audit_log(user_id: str | None, action: str, status: str,
              ip: str = "", user_agent: str = "", details: str = "") -> None:
    db = SessionLocal()
    try:
        db.add(AuditLogModel(
            user_id=user_id, action=action, status=status,
            ip_address=ip, user_agent=user_agent,
            details=details, timestamp=_now(),
        ))
        db.commit()
    except Exception:
        pass  # Don't let audit logging break the app
    finally:
        db.close()


# ── Progress (unchanged from v2) ────────────────────────────────────────

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
                score=0, started_at=_now(),
            )
            db.add(prog)
        for key, val in data.items():
            if key in ("lessons_completed", "exercises_completed"):
                setattr(prog, key, json.dumps(val))
            elif hasattr(prog, key):
                setattr(prog, key, val)
        prog.updated_at = _now()
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
            submitted_at=_now(),
        ))
        db.commit()
    finally:
        db.close()
