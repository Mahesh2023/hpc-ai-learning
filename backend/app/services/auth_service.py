"""
Authentication Service Layer v3.0

Provides core authentication functionality for the HPC AI Learning platform,
including JWT token management, user authentication, TOTP-based two-factor
authentication, password strength validation, and session management.

All database interactions are delegated to the models.database module.
Tokens are issued as JWTs with configurable expiry, issuer, and audience claims.
"""

import uuid
import hashlib
import base64
import io
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
import pyotp
import qrcode

from ..config import (
    SECRET_KEY,
    REFRESH_SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    TOKEN_ISSUER,
    TOKEN_AUDIENCE,
)
from ..models.database import (
    hash_password,
    verify_password,
    needs_rehash,
    get_user_by_email,
    get_user_by_id,
    update_user,
    is_account_locked,
    record_failed_login,
    reset_failed_logins,
    update_last_login,
    blacklist_token,
    is_token_blacklisted,
    create_session,
    validate_refresh_token,
    revoke_session,
    revoke_all_sessions,
    audit_log,
    enable_totp,
    disable_totp,
    use_recovery_code,
)


def create_access_token(user_id: str, role: str = "learner") -> str:
    """Create a signed JWT access token.

    Args:
        user_id: The unique identifier of the user (stored in the 'sub' claim).
        role: The user's role, defaults to 'learner'.

    Returns:
        A signed JWT string containing access token claims.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    claims = {
        "sub": user_id,
        "exp": expire,
        "iat": now,
        "jti": str(uuid.uuid4()),
        "iss": TOKEN_ISSUER,
        "aud": TOKEN_AUDIENCE,
        "role": role,
        "type": "access",
    }
    return jwt.encode(claims, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create a signed JWT refresh token.

    Args:
        user_id: The unique identifier of the user (stored in the 'sub' claim).

    Returns:
        A signed JWT string containing refresh token claims.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    claims = {
        "sub": user_id,
        "exp": expire,
        "iat": now,
        "jti": str(uuid.uuid4()),
        "iss": TOKEN_ISSUER,
        "aud": TOKEN_AUDIENCE,
        "type": "refresh",
    }
    return jwt.encode(claims, REFRESH_SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Decode and validate a JWT access token.

    Verifies the token signature, expiry, issuer, and audience. Also checks
    whether the token has been blacklisted (revoked) by its JTI.

    Args:
        token: The raw JWT string to decode.

    Returns:
        The decoded payload dictionary, or None if the token is invalid,
        expired, or blacklisted.
    """
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            audience=TOKEN_AUDIENCE,
            issuer=TOKEN_ISSUER,
        )
        jti = payload.get("jti")
        if jti and is_token_blacklisted(jti):
            return None
        return payload
    except JWTError:
        return None
    except Exception:
        return None


def decode_refresh_token(token: str) -> dict | None:
    """Decode and validate a JWT refresh token.

    Verifies the token signature, expiry, issuer, audience, and that the
    token type is 'refresh'. Also checks whether the token has been
    blacklisted by its JTI.

    Args:
        token: The raw JWT string to decode.

    Returns:
        The decoded payload dictionary, or None if the token is invalid,
        expired, blacklisted, or not a refresh token.
    """
    try:
        payload = jwt.decode(
            token,
            REFRESH_SECRET_KEY,
            algorithms=[ALGORITHM],
            audience=TOKEN_AUDIENCE,
            issuer=TOKEN_ISSUER,
        )
        if payload.get("type") != "refresh":
            return None
        jti = payload.get("jti")
        if jti and is_token_blacklisted(jti):
            return None
        return payload
    except JWTError:
        return None
    except Exception:
        return None


def authenticate_user(
    email: str,
    password: str,
    ip: str = "",
    user_agent: str = "",
) -> dict:
    """Authenticate a user with email and password.

    Implements the full login flow with account lockout checks, timing-attack
    mitigation, password rehashing, and comprehensive audit logging.

    Args:
        email: The user's email address.
        password: The plaintext password to verify.
        ip: The client IP address for audit logging.
        user_agent: The client user-agent string for audit logging.

    Returns:
        A sanitised user dictionary (without sensitive fields such as
        password hashes).

    Raises:
        ValueError: If the account is locked, credentials are invalid, or
            the user is not found (generic message to avoid enumeration).
    """
    # Check if the account is currently locked out
    if is_account_locked(email):
        audit_log(None, "login_failed_locked", "blocked", ip=ip, user_agent=user_agent, details=email)
        raise ValueError("Account is temporarily locked. Please try again later.")

    # Retrieve the user record with sensitive fields (password hash) included
    user = get_user_by_email(email, sensitive=True)
    if not user:
        # Perform a dummy password verification to prevent timing-based
        # user enumeration attacks
        verify_password(password, "$2b$12$dummy.hash.to.prevent.timing.attacks.000000000000000000000")
        audit_log(None, "login_failed", "failure", ip=ip, user_agent=user_agent, details=f"unknown email: {email}")
        raise ValueError("Invalid email or password.")

    # Verify the supplied password against the stored hash
    if not verify_password(password, user.get("password_hash", "")):
        record_failed_login(email)
        audit_log(user["id"], "login_failed", "failure", ip=ip, user_agent=user_agent)
        raise ValueError("Invalid email or password.")

    # Rehash the password if the current hash uses outdated parameters
    if needs_rehash(user.get("password_hash", "")):
        new_hash = hash_password(password)
        update_user(user["id"], password_hash=new_hash)

    # Clear any accumulated failed-login counters
    reset_failed_logins(email)

    # Record the successful login timestamp
    update_last_login(user["id"], ip)

    # Audit the successful authentication event
    audit_log(user["id"], "login_success", "success", ip=ip, user_agent=user_agent)

    # Return the user record without sensitive fields
    return get_user_by_id(user["id"])


def generate_totp_secret(user_email: str) -> dict:
    """Generate a new TOTP secret and provisioning QR code.

    Creates a random TOTP secret, builds an otpauth:// provisioning URI
    for the user, and renders the URI as a QR code encoded in base64 PNG
    format for easy embedding in API responses or HTML.

    Args:
        user_email: The user's email address (used as the account name
            in the provisioning URI).

    Returns:
        A dictionary with keys:
            - secret: The base32-encoded TOTP secret.
            - qr_uri: The otpauth:// provisioning URI.
            - qr_code_base64: The QR code image as a base64-encoded PNG string.
    """
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user_email,
        issuer_name="HPC AI Learning",
    )

    # Generate a QR code image and encode it as a base64 PNG
    qr_img = qrcode.make(provisioning_uri)
    buffer = io.BytesIO()
    qr_img.save(buffer, format="PNG")
    buffer.seek(0)
    qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "secret": secret,
        "qr_uri": provisioning_uri,
        "qr_code_base64": qr_base64,
    }


def verify_totp_code(secret: str, code: str) -> bool:
    """Verify a TOTP code against a shared secret.

    Allows a ±1 time-step window to account for minor clock drift between
    the server and the user's authenticator application.

    Args:
        secret: The base32-encoded TOTP shared secret.
        code: The 6-digit TOTP code to verify.

    Returns:
        True if the code is valid within the allowed window, False otherwise.
    """
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)
    except Exception:
        return False


def check_password_strength(password: str) -> dict:
    """Evaluate the strength of a password.

    Computes a score from 0 (very weak) to 4 (strong) based on length,
    character diversity, and the presence of uppercase letters, lowercase
    letters, digits, and special characters. No external dependencies are
    used.

    Args:
        password: The plaintext password to evaluate.

    Returns:
        A dictionary with keys:
            - score: An integer from 0 to 4.
            - feedback: A human-readable strength label.
            - suggestions: A list of actionable improvement suggestions.
    """
    score = 0
    suggestions: list[str] = []

    # --- Length checks ---
    length = len(password)
    if length >= 8:
        score += 1
    else:
        suggestions.append("Use at least 8 characters.")

    if length >= 12:
        score += 1

    # --- Character class checks ---
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(not c.isalnum() for c in password)

    diversity = sum([has_upper, has_lower, has_digit, has_special])

    if diversity >= 3:
        score += 1
    if diversity >= 4:
        score += 1

    if not has_upper:
        suggestions.append("Add uppercase letters.")
    if not has_lower:
        suggestions.append("Add lowercase letters.")
    if not has_digit:
        suggestions.append("Add digits.")
    if not has_special:
        suggestions.append("Add special characters (e.g., !@#$%^&*).")

    # Clamp score to the 0-4 range
    score = max(0, min(4, score))

    feedback_map = {
        0: "Very weak",
        1: "Weak",
        2: "Fair",
        3: "Strong",
        4: "Very strong",
    }

    return {
        "score": score,
        "feedback": feedback_map[score],
        "suggestions": suggestions,
    }


def hash_refresh_token(token: str) -> str:
    """Produce a SHA-256 hex digest of a refresh token.

    Used to store a non-reversible representation of the refresh token in
    the database so the raw token is never persisted.

    Args:
        token: The raw JWT refresh token string.

    Returns:
        The SHA-256 hex digest of the token.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
