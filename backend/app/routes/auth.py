"""Authentication routes."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from ..models.schemas import UserCreate, UserLogin, UserOut, Token
from ..models.database import create_user, get_user_by_email, get_user_by_id, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = "hpc-ai-learning-secret-key-change-in-production"
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str | None = Depends(oauth2_scheme)) -> dict | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = payload.get("sub")
        if not uid:
            return None
        return get_user_by_id(uid)
    except JWTError:
        return None


async def require_user(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


@router.post("/register", response_model=Token)
async def register(data: UserCreate):
    try:
        user = create_user(data.username, data.email, data.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return Token(access_token=_create_token(user["id"]))


@router.post("/login", response_model=Token)
async def login(data: UserLogin):
    user = get_user_by_email(data.email)
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return Token(access_token=_create_token(user["id"]))


@router.get("/me", response_model=UserOut)
async def me(user=Depends(require_user)):
    return UserOut(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        level=user.get("level", "beginner"),
        created_at=user.get("created_at", ""),
    )
