import asyncio
import random
import sqlite3
import re

# -------------------------------
# CONFIG
# -------------------------------
DB_PATH = "database.db"
CHUNK_SIZE = 1000  # characters per chunk (adjust as needed)

# In-memory pointer (simple version)
DOCUMENT_READ_POINTERS = {}


# -------------------------------
# DB HELPERS
# -------------------------------
def get_full_pdf_text(document_id: int) -> str:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT content FROM documents WHERE id = ?",
        (document_id,)
    )
    row = cursor.fetchone()
    conn.close()

    return row[0] if row else ""


# -------------------------------
# CHUNKING
# -------------------------------
def split_into_chunks(text: str, chunk_size: int = CHUNK_SIZE):
    return [
        text[i:i + chunk_size]
        for i in range(0, len(text), chunk_size)
    ]


def split_into_sentences(text: str):
    return re.split(r'(?<=[.!?]) +', text)


# -------------------------------
# RELEVANCE (LIGHTWEIGHT)
# -------------------------------
def pick_relevant_chunk(chunks, question: str):
    scored = []

    for i, chunk in enumerate(chunks):
        score = sum(
            word.lower() in chunk.lower()
            for word in question.split()
        )

        # small bias toward earlier chunks (optional)
        score -= i * 0.01

        scored.append((score, chunk))

    scored.sort(reverse=True)
    return scored[0][1] if scored else ""


# -------------------------------
# SEQUENTIAL READER
# -------------------------------
def get_next_chunk(document_id: int):
    text = get_full_pdf_text(document_id)

    if not text:
        return "No content found."

    if document_id not in DOCUMENT_READ_POINTERS:
        DOCUMENT_READ_POINTERS[document_id] = 0

    start = DOCUMENT_READ_POINTERS[document_id]
    end = start + CHUNK_SIZE

    chunk = text[start:end]

    DOCUMENT_READ_POINTERS[document_id] = end

    return chunk if chunk else "[End of Document]"


def reset_reader(document_id: int):
    DOCUMENT_READ_POINTERS[document_id] = 0


# -------------------------------
# STREAMING ENGINE (FAST + SCALABLE)
# speed: 0.0 (slow) → 1.0 (ultra fast ~Groq)
# -------------------------------

def clamp_speed(speed: float) -> float:
    return max(0.0, min(1.0, speed))


# -------------------------------
# STREAMING ENGINE
# -------------------------------
async def stream_text(response: str, mode: str = "char", speed: float = 0.93):

    speed = clamp_speed(speed)

    # Base delays (word mode baseline)
    CHAR_BASE = 0.0005
    WORD_BASE = 0.08

    # Groq-like nonlinear acceleration curve
    factor = (1 - speed) ** 2

    # -----------------------
    # MODE MULTIPLIER
    # -----------------------
    mode_multiplier = 10.0 if mode == "char" else 1.0

    # Apply faster scaling for char mode
    char_base = CHAR_BASE / mode_multiplier
    word_base = WORD_BASE

    # -----------------------
    # CHAR MODE
    # -----------------------
    if mode == "char":
        for char in response:
            yield char

            # ultra-fast mode (Groq-like)
            if speed >= 0.95:
                continue

            if char in ".!?":
                await asyncio.sleep(char_base * 4.5 * factor)
            elif char in ",;:":
                await asyncio.sleep(char_base * 2.2 * factor)
            elif char == " ":
                await asyncio.sleep(char_base * 1.3 * factor)
            else:
                await asyncio.sleep(random.uniform(0.000005, 0.00002) * factor)

    # -----------------------
    # WORD MODE
    # -----------------------
    elif mode == "word":
        words = response.split(" ")

        for word in words:
            yield word + " "

            if speed >= 0.95:
                continue

            if word.endswith((".", "!", "?")):
                await asyncio.sleep(word_base * 2.0 * factor)
            elif word.endswith((",", ";", ":")):
                await asyncio.sleep(word_base * 1.0 * factor)
            else:
                await asyncio.sleep(random.uniform(0.01, 0.03) * factor)

    # -----------------------
    # FALLBACK
    # -----------------------
    else:
        yield response


# -------------------------------
# MAIN ENTRY POINT
# -------------------------------
async def reader_stream_response(
    document_id: int,
    question: str = "",
    mode: str = "char",
    strategy: str = "sequential"  # or "relevant"
):
    text = get_full_pdf_text(document_id)

    if not text:
        yield "No content found."
        return

    # -----------------------
    # STRATEGY: SEQUENTIAL
    # -----------------------
    if strategy == "sequential":
        response = get_next_chunk(document_id)

    # -----------------------
    # STRATEGY: RELEVANT
    # -----------------------
    elif strategy == "relevant":
        chunks = split_into_chunks(text)
        response = pick_relevant_chunk(chunks, question)

    # -----------------------
    # STRATEGY: SENTENCE MATCH (better)
    # -----------------------
    elif strategy == "sentence":
        sentences = split_into_sentences(text)
        response = pick_relevant_chunk(sentences, question)

    else:
        response = "Invalid strategy."

    # -----------------------
    # STREAM IT
    # -----------------------
    async for token in stream_text(response, mode):
        yield token
