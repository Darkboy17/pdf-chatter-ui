from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.database import get_db
from app.core.firebase_auth import get_current_user
from app.services import pdf_service, vector_service
from app.repositories import document_repo

import logging
import traceback
from pathlib import Path

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upload-pdf/")
async def upload_pdf(
    file: UploadFile = File(...),
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    stage = "starting upload"
    path = None
    doc_id = None

    try:
        stage = "validating file type"
        logger.info("Upload started: filename=%s content_type=%s", file.filename, file.content_type)

        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDFs allowed")

        stage = "reading uploaded file"
        content = await file.read()
        logger.info("File read successfully: filename=%s size=%s bytes", file.filename, len(content))

        stage = "preparing user/session data"
        user_id = current_user["uid"]
        session_id = current_user["session_id"]
        logger.info("Upload user/session resolved: user_id=%s session_id=%s", user_id, session_id)

        stage = "computing file hash"
        file_hash = pdf_service.compute_hash(
            user_id.encode("utf-8") + b":" + content
        )
        logger.info("File hash computed: hash=%s", file_hash)

        stage = "checking duplicate document"
        existing_document = document_repo.get_document_by_hash(conn, file_hash, session_id)
        if existing_document:
            logger.info("Duplicate PDF detected: filename=%s hash=%s", file.filename, file_hash)
            return {
                "duplicate": True,
                "message": "This PDF is already uploaded.",
            }

        stage = "saving PDF to disk"
        path = pdf_service.save_pdf(content, session_id, file_hash)
        logger.info("PDF saved successfully: path=%s", path)

        stage = "extracting PDF data"
        pages, metadata = pdf_service.extract_pdf_data(path, file.filename)
        logger.info(
            "PDF data extracted: filename=%s pages=%s metadata_keys=%s",
            file.filename,
            len(pages) if pages else 0,
            list(metadata.keys()) if isinstance(metadata, dict) else type(metadata).__name__,
        )

        stage = "combining page text"
        text = pdf_service.combine_page_text(pages)
        logger.info("PDF text combined: text_length=%s", len(text or ""))

        if not text or not text.strip():
            raise HTTPException(
                status_code=400,
                detail="No readable text found in this PDF.",
            )

        stage = "inserting document into database"
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
        logger.info("Document inserted into DB: document_id=%s filename=%s", doc_id, file.filename)

        stage = "creating vector index"
        vector_service.create_index(
            session_id,
            doc_id,
            file.filename,
            text,
            path,
        )
        logger.info("Vector index created successfully: document_id=%s", doc_id)

        stage = "returning upload response"
        return {
            "status": "success",
            "document_id": doc_id,
            "filename": file.filename,
            "metadata": metadata,
        }

    except HTTPException:
        logger.exception("Upload failed with HTTPException at stage: %s", stage)
        raise

    except Exception as e:
        logger.exception("Upload failed at stage: %s", stage)

        # Optional cleanup: only cleanup if indexing or DB/file operations failed.
        # This prevents broken DB rows when vector indexing fails.
        try:
            if doc_id is not None:
                logger.info("Cleaning up DB document after failure: document_id=%s", doc_id)
                document_repo.delete_document(conn, doc_id, current_user["session_id"])
        except Exception:
            logger.exception("Failed to cleanup DB document after upload failure")

        try:
            if doc_id is not None:
                logger.info("Cleaning up vector index after failure: document_id=%s", doc_id)
                vector_service.delete_index(current_user["session_id"], doc_id)
        except Exception:
            logger.exception("Failed to cleanup vector index after upload failure")

        try:
            if path:
                file_path = Path(path)
                if file_path.exists():
                    logger.info("Cleaning up saved PDF after failure: path=%s", path)
                    file_path.unlink()
        except Exception:
            logger.exception("Failed to cleanup saved PDF after upload failure")

        raise HTTPException(
            status_code=500,
            detail={
                "message": "Upload failed.",
                "stage": stage,
                "error_type": type(e).__name__,
                "error": str(e),
                "traceback": traceback.format_exc(),
            },
        )
