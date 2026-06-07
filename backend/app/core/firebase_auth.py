import base64
import json

import httpx
from fastapi import Depends, HTTPException, Request, status

from app.core.config import settings
from app.core.database import get_db
from app.core.tls import system_ssl_context
from app.repositories import user_repo


FIREBASE_AUTH_URL = "https://identitytoolkit.googleapis.com/v1/accounts"


def _require_firebase_configuration() -> None:
    if not settings.FIREBASE_WEB_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase authentication is not configured on the server.",
        )


def _token_expiration(id_token: str) -> int:
    try:
        payload_part = id_token.split(".")[1]
        padding = "=" * (-len(payload_part) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_part + padding))
        return int(payload["exp"])
    except (IndexError, KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication session. Please log in again.",
        )


async def lookup_firebase_user(id_token: str) -> dict:
    _require_firebase_configuration()

    try:
        async with httpx.AsyncClient(
            timeout=15,
            verify=system_ssl_context(),
        ) as client:
            response = await client.post(
                f"{FIREBASE_AUTH_URL}:lookup",
                params={"key": settings.FIREBASE_WEB_API_KEY},
                json={"idToken": id_token},
            )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication verification is temporarily unavailable.",
        )

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication session. Please log in again.",
        )

    users = response.json().get("users", [])
    if not users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication session. Please log in again.",
        )

    return users[0]


async def get_current_user(request: Request, conn=Depends(get_db)):
    id_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not id_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    user = await lookup_firebase_user(id_token)
    return {
        "uid": user["localId"],
        "email": user.get("email"),
        "expires_at": _token_expiration(id_token),
        "session_id": user_repo.get_or_create_session_id(conn, user["localId"]),
    }
