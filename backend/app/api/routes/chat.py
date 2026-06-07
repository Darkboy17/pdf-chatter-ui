import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import QueryRequest
from app.core.database import get_db
from app.core.firebase_auth import get_current_user
from app.repositories import document_repo
from app.services import pdf_service
from app.services.vector_service import load_index
from app.services.chat_service import stream_chat
from app.core.ai import build_groq_llm
from llama_index.core.memory import ChatMemoryBuffer

chat_sessions = {}

router = APIRouter()

llm = build_groq_llm("llama-3.1-8b-instant")


def _document_metadata(document, conn, session_id):
    raw_metadata = document["metadata_json"]
    if raw_metadata:
        try:
            return json.loads(raw_metadata)
        except json.JSONDecodeError:
            pass

    metadata = {"filename": document["filename"]}
    if document["storage_path"] and Path(document["storage_path"]).exists():
        metadata = pdf_service.extract_metadata(
            document["storage_path"], document["filename"]
        )
    document_repo.update_document_metadata(
        conn, document["id"], session_id, metadata
    )
    return metadata


@router.post("/ask-question/")
def ask_question(
    req: QueryRequest,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    session_id = current_user["session_id"]
    document = document_repo.get_document(conn, req.document_id, session_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    metadata = _document_metadata(document, conn, session_id)
    index = load_index(
        session_id,
        req.document_id,
        document["filename"],
        document["content"],
        document["storage_path"],
    )

    conversation_id = req.conversation_id or "legacy"
    chat_session_id = f"{session_id}:{req.document_id}:{conversation_id}"

    if chat_session_id not in chat_sessions:
        chat_sessions[chat_session_id] = ChatMemoryBuffer.from_defaults(token_limit=3900)

    memory = chat_sessions[chat_session_id]

    return stream_chat(index, llm, req.question, memory, metadata)
