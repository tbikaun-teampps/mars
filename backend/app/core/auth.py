"""Authentication and authorization utilities."""

import logging
import time
from typing import Annotated, Optional

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

# HTTP Bearer token security scheme
security = HTTPBearer()

# Header name for impersonation
IMPERSONATE_HEADER = "X-Impersonate-User-Id"

# Cache for JWKS keys
_jwks_cache: dict = {"keys": None, "fetched_at": 0}
JWKS_CACHE_TTL = 3600  # 1 hour


class User:
    """Represents an authenticated user."""

    def __init__(
        self,
        id: str,
        email: str,
        actual_user_id: Optional[str] = None,
        is_impersonating: bool = False,
    ):
        self.id = id
        self.email = email
        # When impersonating, actual_user_id is the real admin's ID
        self.actual_user_id = actual_user_id
        self.is_impersonating = is_impersonating


def _get_jwks() -> list[dict]:
    """Fetch and cache JWKS from Supabase."""
    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < JWKS_CACHE_TTL:
        return _jwks_cache["keys"]

    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    try:
        response = httpx.get(jwks_url, timeout=10)
        response.raise_for_status()
        jwks_data = response.json()
        _jwks_cache["keys"] = jwks_data.get("keys", [])
        _jwks_cache["fetched_at"] = now
        logger.info(f"Fetched {len(_jwks_cache['keys'])} keys from JWKS endpoint")
        return _jwks_cache["keys"]
    except Exception as e:
        logger.warning(f"Failed to fetch JWKS: {e}")
        return _jwks_cache.get("keys") or []


def _get_signing_key(token: str) -> tuple[str, str]:
    """
    Get the appropriate signing key for a token.

    Returns:
        Tuple of (key, algorithm) to use for verification
    """
    header = jwt.get_unverified_header(token)
    alg = header.get("alg", "HS256")
    kid = header.get("kid")

    # For HS256, use the symmetric secret
    if alg == "HS256":
        return settings.supabase_jwt_secret, "HS256"

    # For asymmetric algorithms (ES256, RS256), use JWKS
    if alg in ("ES256", "RS256"):
        keys = _get_jwks()
        for key_data in keys:
            if kid and key_data.get("kid") != kid:
                continue
            if key_data.get("alg") == alg:
                # Convert JWK to PEM format
                key_obj = jwk.construct(key_data, alg)
                return key_obj, alg

        raise JWTError(f"No matching key found for kid={kid}, alg={alg}")

    raise JWTError(f"Unsupported algorithm: {alg}")


def verify_token(token: str) -> dict:
    """
    Verify and decode a Supabase JWT token.

    Supports both HS256 (legacy) and ES256/RS256 (asymmetric) tokens.

    Args:
        token: The JWT token string

    Returns:
        The decoded token payload

    Raises:
        HTTPException: If the token is invalid or expired
    """
    try:
        key, alg = _get_signing_key(token)
        payload = jwt.decode(
            token,
            key,
            algorithms=[alg],
            audience="authenticated",
        )
        return payload
    except JWTError as e:
        logger.error(f"JWT verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> User:
    """
    FastAPI dependency to get the current authenticated user.

    Extracts the JWT token from the Authorization header, verifies it,
    and returns the user information. Supports user impersonation in debug mode.

    Args:
        request: The FastAPI request object (for accessing headers)
        credentials: HTTP Bearer credentials from the request

    Returns:
        User object containing user ID and email

    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    payload = verify_token(token)

    # Extract user info from JWT payload
    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check for impersonation header (debug mode only)
    impersonate_user_id = request.headers.get(IMPERSONATE_HEADER)

    if impersonate_user_id:
        # Only allow impersonation in debug mode
        if not settings.debug_mode:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User impersonation is not allowed in production mode",
            )

        # Validate admin status using inline db session
        is_admin = await _check_user_is_admin_for_impersonation(user_id)

        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can impersonate other users",
            )

        # Fetch the impersonated user's email from the database
        impersonated_email = await _get_user_email_for_impersonation(impersonate_user_id)
        if not impersonated_email:
            logger.warning(f"Impersonation failed: user {impersonate_user_id} does not have an email address")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Impersonated user not found or has no email address",
            )

        logger.info(f"User {user_id} ({email}) is impersonating user {impersonate_user_id}")

        # Return user with impersonated ID and email
        return User(
            id=impersonate_user_id,
            email=impersonated_email,
            actual_user_id=user_id,
            is_impersonating=True,
        )

    return User(id=user_id, email=email or "")


async def _check_user_is_admin_for_impersonation(user_id: str) -> bool:
    """
    Check if user is admin for impersonation purposes.

    Uses an inline database session to avoid circular dependencies.
    """
    from datetime import date
    from uuid import UUID

    from sqlalchemy import or_
    from sqlmodel import select

    from app.core.database import async_session_maker
    from app.models.db_models import RoleDB, UserRoleDB

    today = date.today()

    async with async_session_maker() as db:
        query = (
            select(RoleDB)
            .join(UserRoleDB, UserRoleDB.role_id == RoleDB.role_id)
            .where(
                UserRoleDB.user_id == UUID(user_id),
                UserRoleDB.is_active.is_(True),
                RoleDB.is_active.is_(True),
                RoleDB.role_type == "admin",
                or_(UserRoleDB.valid_to.is_(None), UserRoleDB.valid_to >= today),
                or_(UserRoleDB.valid_from.is_(None), UserRoleDB.valid_from <= today),
            )
        )
        result = await db.exec(query)
        admin_roles = result.all()

        return len(admin_roles) > 0


async def _get_user_email_for_impersonation(user_id: str) -> Optional[str]:
    """
    Fetch user email from the profiles table for impersonation.

    Uses an inline database session to avoid circular dependencies.

    Args:
        user_id: The user ID to fetch email for

    Returns:
        The user's email, or empty string if not found
    """
    from uuid import UUID

    from sqlmodel import select

    from app.core.database import async_session_maker
    from app.models.db_models import ProfileDB

    async with async_session_maker() as db:
        query = select(ProfileDB).where(ProfileDB.id == UUID(user_id))
        result = await db.exec(query)
        profile = result.first()

        if profile and profile.email:
            return profile.email
