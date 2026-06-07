from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.database import get_db
from app.core.firebase_auth import get_current_user
from app.services import pdf_service, vector_service
from app.repositories import document_repo

router = APIRouter()

@router.post("/upload-pdf/")
async def upload_pdf(
    file: UploadFile = File(...),
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDFs allowed")

    content = await file.read()
    user_id = current_user["uid"]
    session_id = current_user["session_id"]
    file_hash = pdf_service.compute_hash(
        user_id.encode("utf-8") + b":" + content
    )

    if document_repo.get_document_by_hash(conn, file_hash, session_id):
        return {"duplicate": True, "message": "This PDF is already uploaded."}

    path = pdf_service.save_pdf(content, session_id, file_hash)
    pages, metadata = pdf_service.extract_pdf_data(path, file.filename)
    text = pdf_service.combine_page_text(pages)

    doc_id = document_repo.insert_document(
        conn,
        file.filename,
        text,
        file_hash,
        pdf_service.get_current_time(),
        user_id,
        path,
        session_id,
        metadata,
    )

    vector_service.create_index(session_id, doc_id, file.filename, text, path)

    return {"document_id": doc_id, "filename": file.filename, "metadata": metadata}
