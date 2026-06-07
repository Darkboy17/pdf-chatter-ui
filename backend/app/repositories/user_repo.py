import uuid
from datetime import datetime, timezone


def get_or_create_session_id(conn, firebase_uid: str) -> str:
    cursor = conn.cursor()
    cursor.execute(
        "SELECT session_id FROM users WHERE firebase_uid = ?",
        (firebase_uid,),
    )
    existing = cursor.fetchone()
    if existing:
        return existing["session_id"]

    session_id = uuid.uuid4().hex
    cursor.execute(
        """
        INSERT INTO users (firebase_uid, session_id, created_at)
        VALUES (?, ?, ?)
        """,
        (firebase_uid, session_id, datetime.now(timezone.utc).isoformat()),
    )
    cursor.execute(
        """
        UPDATE documents
        SET session_id = ?
        WHERE owner_uid = ? AND session_id IS NULL
        """,
        (session_id, firebase_uid),
    )
    conn.commit()
    return session_id
