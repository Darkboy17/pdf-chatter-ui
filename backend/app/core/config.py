import os
from dotenv import load_dotenv

load_dotenv()


class AppSettings:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY")
    SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "pdf_chatter_session")
    SESSION_REFRESH_COOKIE_NAME = os.getenv(
        "SESSION_REFRESH_COOKIE_NAME",
        f"{SESSION_COOKIE_NAME}_refresh",
    )
    SESSION_REFRESH_COOKIE_MAX_AGE_SECONDS = max(
        24 * 60 * 60,
        int(os.getenv("SESSION_REFRESH_COOKIE_MAX_AGE_SECONDS", str(365 * 24 * 60 * 60))),
    )
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "lax").lower()
    if SESSION_COOKIE_SAMESITE not in {"strict", "lax", "none"}:
        SESSION_COOKIE_SAMESITE = "lax"
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ]
    EMBEDDING_MODEL_NAME = os.getenv(
        "EMBEDDING_MODEL_NAME",
        "sentence-transformers/all-MiniLM-L6-v2",
    )
    CHROMA_DIR = "chroma_db"
    UPLOADS_DIR = "uploads"
    DATABASE_URL = "database.db"

settings = AppSettings()
