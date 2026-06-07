import hashlib
import re
import fitz
from datetime import datetime
from pathlib import Path
from app.core.config import settings


EDITION_PATTERN = re.compile(
    r"\b(?:"
    r"(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|"
    r"\d+(?:st|nd|rd|th))\s+(?:edition|ed\.?)"
    r"|(?:edition|ed\.?)\s*[:\-]\s*(?:first|second|third|fourth|fifth|sixth|seventh|"
    r"eighth|ninth|tenth|\d+(?:st|nd|rd|th))"
    r")\b",
    re.IGNORECASE,
)


def save_pdf(content, session_id, file_hash):
    owner_directory = hashlib.sha256(session_id.encode("utf-8")).hexdigest()
    uploads_directory = Path(settings.UPLOADS_DIR) / owner_directory
    uploads_directory.mkdir(parents=True, exist_ok=True)
    path = uploads_directory / f"{file_hash}.pdf"
    path.write_bytes(content)

    return str(path)


def compute_hash(content):
    return hashlib.sha256(content).hexdigest()


def _clean_metadata_value(value):
    if not value:
        return None
    normalized = " ".join(str(value).split())
    return normalized or None


def _detected_edition(pages, embedded_metadata=None):
    opening_text = "\n".join(page["text"] for page in pages[:5])[:20000]
    match = EDITION_PATTERN.search(opening_text)
    if match:
        return _clean_metadata_value(match.group(0)), "visible text in the opening pages"

    embedded_metadata = embedded_metadata or {}
    metadata_text = "\n".join(
        str(embedded_metadata.get(key, "")) for key in ("title", "subject", "keywords")
    )
    match = EDITION_PATTERN.search(metadata_text)
    if match:
        return _clean_metadata_value(match.group(0)), "embedded PDF metadata"
    return None, None


def extract_pdf_data(file_path, filename=None):
    with fitz.open(file_path) as doc:
        pages = []
        for page_number, page in enumerate(doc, start=1):
            text = page.get_text()
            if text.strip():
                pages.append({"page_number": page_number, "text": text})

        embedded = doc.metadata or {}
        edition, edition_source = _detected_edition(pages, embedded)
        metadata = {
            "filename": _clean_metadata_value(filename),
            "page_count": doc.page_count,
            "file_size_bytes": Path(file_path).stat().st_size,
            "pdf_format": _clean_metadata_value(embedded.get("format")),
            "title": _clean_metadata_value(embedded.get("title")),
            "author": _clean_metadata_value(embedded.get("author")),
            "subject": _clean_metadata_value(embedded.get("subject")),
            "keywords": _clean_metadata_value(embedded.get("keywords")),
            "creator": _clean_metadata_value(embedded.get("creator")),
            "producer": _clean_metadata_value(embedded.get("producer")),
            "creation_date": _clean_metadata_value(embedded.get("creationDate")),
            "modification_date": _clean_metadata_value(embedded.get("modDate")),
            "is_encrypted": bool(doc.is_encrypted),
            "edition": edition,
        }
        if edition_source:
            metadata["edition_source"] = edition_source

    return pages, {key: value for key, value in metadata.items() if value is not None}


def extract_pages(file_path):
    pages, _ = extract_pdf_data(file_path)
    return pages


def extract_metadata(file_path, filename=None):
    _, metadata = extract_pdf_data(file_path, filename)
    return metadata


def combine_page_text(pages):
    return "\n".join(page["text"] for page in pages)


def extract_text(file_path):
    return combine_page_text(extract_pages(file_path))


def get_current_time():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
