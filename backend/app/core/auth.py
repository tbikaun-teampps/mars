"""Authentication and authorization utilities."""

import logging
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

# HTTP Bearer token security scheme
security = HTTPBearer()

# Header name for impersonation
IMPERSONATE_HEADER = "X-Impersonate-User-Id"


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


def verify_token(token: str) -> dict:
    """
    Verify and decode a Supabase JWT token.

    Args:
        token: The JWT token string

    Returns:
        The decoded token payload

    Raises:
        HTTPException: If the token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError as e:
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
        impersonated_email = await _get_user_email_for_impersonation(
            impersonate_user_id
        )
        if not impersonated_email:
            logger.warning(
                f"Impersonation failed: user {impersonate_user_id} does not have an email address"
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Impersonated user not found or has no email address",
            )

        logger.info(
            f"User {user_id} ({email}) is impersonating user {impersonate_user_id}"
        )

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
