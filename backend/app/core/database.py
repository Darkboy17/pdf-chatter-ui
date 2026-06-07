import sqlite3

from app.core.config import settings


def init_db():
    conn = sqlite3.connect(settings.DATABASE_URL, check_same_thread=False)
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            firebase_uid TEXT PRIMARY KEY,
            session_id TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            content TEXT,
            file_hash TEXT UNIQUE,
            uploaded_date TEXT,
            owner_uid TEXT,
            storage_path TEXT,
            session_id TEXT,
            metadata_json TEXT
        )
        """
    )

    cursor.execute("PRAGMA table_info(documents)")
    document_columns = {column[1] for column in cursor.fetchall()}
    if "owner_uid" not in document_columns:
        cursor.execute("ALTER TABLE documents ADD COLUMN owner_uid TEXT")
    if "storage_path" not in document_columns:
        cursor.execute("ALTER TABLE documents ADD COLUMN storage_path TEXT")
    if "session_id" not in document_columns:
        cursor.execute("ALTER TABLE documents ADD COLUMN session_id TEXT")
    if "metadata_json" not in document_columns:
        cursor.execute("ALTER TABLE documents ADD COLUMN metadata_json TEXT")

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_documents_owner_uid ON documents (owner_uid)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_documents_session_id ON documents (session_id)"
    )
    conn.commit()
    conn.close()


def get_db():
    conn = sqlite3.connect(settings.DATABASE_URL, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
