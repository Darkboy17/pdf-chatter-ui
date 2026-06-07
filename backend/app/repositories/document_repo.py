import json


def insert_document(
    conn,
    filename,
    content,
    file_hash,
    uploaded_date,
    owner_uid,
    storage_path,
    session_id,
    metadata,
):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO documents
        (filename, content, file_hash, uploaded_date, owner_uid, storage_path, session_id,
         metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            filename,
            content,
            file_hash,
            uploaded_date,
            owner_uid,
            storage_path,
            session_id,
            json.dumps(metadata, ensure_ascii=False),
        ),
    )
    conn.commit()
    return cursor.lastrowid


def get_document_by_hash(conn, file_hash, session_id):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM documents WHERE file_hash = ? AND session_id = ?",
        (file_hash, session_id),
    )
    return cursor.fetchone()


def get_all_documents(conn, session_id):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, filename FROM documents WHERE session_id = ? ORDER BY id",
        (session_id,),
    )
    return cursor.fetchall()


def get_document(conn, document_id, session_id):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, filename, content, storage_path, metadata_json
        FROM documents
        WHERE id = ? AND session_id = ?
        """,
        (document_id, session_id),
    )
    return cursor.fetchone()


def update_document_metadata(conn, document_id, session_id, metadata):
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE documents
        SET metadata_json = ?
        WHERE id = ? AND session_id = ?
        """,
        (json.dumps(metadata, ensure_ascii=False), document_id, session_id),
    )
    conn.commit()


def get_document_by_filename(conn, filename, session_id):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id
        FROM documents
        WHERE filename = ? AND session_id = ?
        ORDER BY id DESC
        LIMIT 1
        """,
        (filename, session_id),
    )
    return cursor.fetchone()


def delete_document(conn, document_id, session_id):
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM documents WHERE id = ? AND session_id = ?",
        (document_id, session_id),
    )
    conn.commit()
