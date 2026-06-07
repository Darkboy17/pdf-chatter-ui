import time

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import get_db
from app.core.firebase_auth import get_current_user, lookup_firebase_user
from app.core.tls import system_ssl_context
from app.models.schemas import AuthRequest
from app.repositories import user_repo


router = APIRouter(prefix="/auth", tags=["auth"])

FIREBASE_AUTH_URL = "https://identitytoolkit.googleapis.com/v1/accounts"
FIREBASE_REFRESH_URL = "https://securetoken.googleapis.com/v1/token"
AUTH_ERROR_MESSAGES = {
    "EMAIL_EXISTS": "An account already exists for that email.",
    "INVALID_EMAIL": "Enter a valid email address.",
    "INVALID_LOGIN_CREDENTIALS": "The email or password is incorrect.",
    "EMAIL_NOT_FOUND": "The email or password is incorrect.",
    "INVALID_PASSWORD": "The email or password is incorrect.",
    "USER_DISABLED": "This account has been disabled.",
    "WEAK_PASSWORD": "Password must be at least 6 characters.",
    "OPERATION_NOT_ALLOWED": "Email and password authentication is not enabled.",
    "TOO_MANY_ATTEMPTS_TRY_LATER": "Too many attempts. Please try again later.",
}


def _require_firebase_configuration() -> None:
    if not settings.FIREBASE_WEB_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase authentication is not configured on the server.",
        )


def _auth_error_detail(response: httpx.Response) -> str:
    error_message = response.json().get("error", {}).get("message", "")
    error_code = error_message.split(" : ")[0]
    return AUTH_ERROR_MESSAGES.get(error_code, "Authentication failed.")


async def authenticate_with_firebase(action: str, credentials: AuthRequest) -> dict:
    _require_firebase_configuration()

    try:
        async with httpx.AsyncClient(timeout=15, verify=system_ssl_context()) as client:
            response = await client.post(
                f"{FIREBASE_AUTH_URL}:{action}",
                params={"key": settings.FIREBASE_WEB_API_KEY},
                json={
                    "email": credentials.email,
                    "password": credentials.password,
                    "returnSecureToken": True,
                },
            )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Firebase authentication.",
        )

    if response.is_success:
        return response.json()

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=_auth_error_detail(response),
    )


async def refresh_firebase_token(refresh_token: str) -> dict:
    _require_firebase_configuration()

    try:
        async with httpx.AsyncClient(timeout=15, verify=system_ssl_context()) as client:
            response = await client.post(
                FIREBASE_REFRESH_URL,
                params={"key": settings.FIREBASE_WEB_API_KEY},
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
            )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to renew authentication session.",
        )

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session expired. Please log in again.",
        )

    result = response.json()
    return {
        "idToken": result["id_token"],
        "refreshToken": result["refresh_token"],
        "expiresIn": result["expires_in"],
        "localId": result["user_id"],
    }


def _user_response_with_cookies(firebase_result: dict, email: str | None = None) -> JSONResponse:
    expires_in = max(1, int(firebase_result["expiresIn"]))
    expires_at = int(time.time()) + expires_in
    response = JSONResponse(
        {
            "uid": firebase_result["localId"],
            "email": firebase_result.get("email", email),
            "expires_at": expires_at,
        }
    )
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=firebase_result["idToken"],
        max_age=expires_in,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/",
    )
    response.set_cookie(
        key=settings.SESSION_REFRESH_COOKIE_NAME,
        value=firebase_result["refreshToken"],
        max_age=settings.SESSION_REFRESH_COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/auth",
    )
    return response


def _delete_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/",
    )
    response.delete_cookie(
        key=settings.SESSION_REFRESH_COOKIE_NAME,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/auth",
    )


@router.post("/signup")
async def signup(credentials: AuthRequest, conn=Depends(get_db)):
    firebase_result = await authenticate_with_firebase("signUp", credentials)
    user_repo.get_or_create_session_id(conn, firebase_result["localId"])
    return _user_response_with_cookies(firebase_result)


@router.post("/login")
async def login(credentials: AuthRequest, conn=Depends(get_db)):
    firebase_result = await authenticate_with_firebase("signInWithPassword", credentials)
    user_repo.get_or_create_session_id(conn, firebase_result["localId"])
    return _user_response_with_cookies(firebase_result)


@router.post("/refresh")
async def refresh(
    refresh_token: str | None = Cookie(
        default=None,
        alias=settings.SESSION_REFRESH_COOKIE_NAME,
    ),
    conn=Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session expired. Please log in again.",
        )

    try:
        firebase_result = await refresh_firebase_token(refresh_token)
        user = await lookup_firebase_user(firebase_result["idToken"])
        user_repo.get_or_create_session_id(conn, user["localId"])
        return _user_response_with_cookies(firebase_result, email=user.get("email"))
    except HTTPException as error:
        if error.status_code == status.HTTP_401_UNAUTHORIZED:
            response = JSONResponse(
                status_code=error.status_code,
                content={"detail": error.detail},
            )
            _delete_auth_cookies(response)
            return response
        raise


@router.post("/logout")
def logout():
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    _delete_auth_cookies(response)
    return response


@router.get("/me")
async def get_authenticated_user(current_user=Depends(get_current_user)):
    return {
        "uid": current_user["uid"],
        "email": current_user.get("email"),
        "expires_at": current_user["expires_at"],
    }
