from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.core.database import get_db
from app.core.firebase_auth import get_current_user
from app.repositories import document_repo
from app.services import vector_service


router = APIRouter()


@router.get("/documents/")
def list_docs(conn=Depends(get_db), current_user=Depends(get_current_user)):
    return document_repo.get_all_documents(conn, current_user["session_id"])


@router.get("/get-all-documents")
def get_all_documents_api(
    conn=Depends(get_db), current_user=Depends(get_current_user)
):
    documents = document_repo.get_all_documents(conn, current_user["session_id"])
    if not documents:
        raise HTTPException(status_code=404, detail="No documents found")

    return {
        "status": "success",
        "documents": [dict(doc) for doc in documents],
    }


@router.get("/get-document-id/")
def get_document_id(
    filename: str, conn=Depends(get_db), current_user=Depends(get_current_user)
):
    result = document_repo.get_document_by_filename(
        conn, filename.strip(), current_user["session_id"]
    )
    if result:
        return {"document_id": result["id"]}

    raise HTTPException(status_code=404, detail="Document not found")


@router.get("/books/")
def get_books(conn=Depends(get_db), current_user=Depends(get_current_user)):
    documents = document_repo.get_all_documents(conn, current_user["session_id"])
    if not documents:
        raise HTTPException(status_code=404, detail="No books found.")

    return [doc["filename"] for doc in documents]


@router.delete("/delete-pdf/{document_id}")
def delete_pdf(
    document_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)
):
    session_id = current_user["session_id"]
    document = document_repo.get_document(conn, document_id, session_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(document["storage_path"])
    if file_path.exists():
        file_path.unlink()

    document_repo.delete_document(conn, document_id, session_id)
    vector_service.delete_index(session_id, document_id)

    return {
        "status": "success",
        "message": f"{document['filename'].replace('.pdf', '')} deleted successfully",
    }


@router.get("/list-uploads/")
def list_uploads(conn=Depends(get_db), current_user=Depends(get_current_user)):
    documents = document_repo.get_all_documents(conn, current_user["session_id"])
    filenames = [doc["filename"] for doc in documents]
    return JSONResponse(content=filenames, status_code=200)
