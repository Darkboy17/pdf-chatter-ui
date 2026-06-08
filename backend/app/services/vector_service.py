from pathlib import Path

import chromadb
from llama_index.core import Document, StorageContext, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.vector_stores.chroma import ChromaVectorStore

from app.core.config import settings
from app.services import pdf_service

try:
    from chromadb.errors import NotFoundError
except ImportError:
    from chromadb.errors import InvalidCollectionException as NotFoundError


INDEX_VERSION = "grounded-chat-v2"
CHUNK_SIZE = 512
CHUNK_OVERLAP = 80
NODE_PARSER = SentenceSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
)


def _client():
    Path(settings.CHROMA_DIR).mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=settings.CHROMA_DIR)


def _collection_name(session_id: str, document_id: int) -> str:
    return f"session_{session_id}_document_{document_id}"


def _vector_store(session_id: str, document_id: int):
    client = _client()
    collection_name = _collection_name(session_id, document_id)

    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={
            "session_id": session_id,
            "document_id": str(document_id),
            "index_version": INDEX_VERSION,
        },
    )

    return collection, ChromaVectorStore(chroma_collection=collection)


def _documents(
    session_id: str,
    document_id: int,
    filename: str,
    text: str,
    storage_path: str | None,
):
    pages = []
    if storage_path and Path(storage_path).exists():
        pages = pdf_service.extract_pages(storage_path)

    if not pages:
        pages = [{"page_number": None, "text": text}]

    documents = []
    for page in pages:
        metadata = {
            "session_id": session_id,
            "document_id": str(document_id),
            "filename": filename,
        }
        if page["page_number"] is not None:
            metadata["page_number"] = page["page_number"]
        metadata_keys = list(metadata)
        documents.append(
            Document(
                text=page["text"],
                metadata=metadata,
                excluded_embed_metadata_keys=metadata_keys,
                excluded_llm_metadata_keys=metadata_keys,
            )
        )

    return documents


def create_index(
    session_id: str,
    document_id: int,
    filename: str,
    text: str,
    storage_path: str | None = None,
):
    delete_index(session_id, document_id)
    _, vector_store = _vector_store(session_id, document_id)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    return VectorStoreIndex.from_documents(
        _documents(session_id, document_id, filename, text, storage_path),
        storage_context=storage_context,
        transformations=[NODE_PARSER],
    )


def load_index(
    session_id: str,
    document_id: int,
    filename: str,
    text: str,
    storage_path: str | None = None,
):
    collection, vector_store = _vector_store(session_id, document_id)
    metadata = collection.metadata or {}
    if collection.count() == 0 or metadata.get("index_version") != INDEX_VERSION:
        return create_index(session_id, document_id, filename, text, storage_path)
    return VectorStoreIndex.from_vector_store(vector_store)


def delete_index(session_id: str, document_id: int):
    collection_name = _collection_name(session_id, document_id)

    try:
        _client().delete_collection(name=collection_name)
    except NotFoundError:
        return
    except ValueError as e:
        if "does not exist" in str(e):
            return
        raise
