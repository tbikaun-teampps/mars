"""Authentication and authorization utilities."""

from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.core.config import settings

# HTTP Bearer token security scheme
security = HTTPBearer()


class User:
    """Represents an authenticated user."""

    def __init__(self, id: str, email: str):
        self.id = id
        self.email = email


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
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> User:
    """
    FastAPI dependency to get the current authenticated user.

    Extracts the JWT token from the Authorization header, verifies it,
    and returns the user information.

    Args:
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

    return User(id=user_id, email=email or "")
