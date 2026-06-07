import asyncio
import random
import sqlite3

# This is a mock LLM service that simulates streaming responses based on PDF content.
def get_pdf_chunks(document_id: int, chunk_size: int = 800):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute(
        "SELECT content FROM documents WHERE id = ?", (document_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return ["No content found for this document."]

    text = row[0]

    # Split into readable chunks (not too big, not too small)
    chunks = [
        text[i:i + chunk_size]
        for i in range(0, len(text), chunk_size)
    ]

    return chunks if chunks else ["Document is empty."]

# Simple relevance scoring to pick the most relevant chunk based on question keywords.
def pick_relevant_chunk(chunks, question):
    scored = []
    for chunk in chunks:
        score = sum(word.lower() in chunk.lower() for word in question.split())
        scored.append((score, chunk))

    scored.sort(reverse=True)
    return scored[0][1] if scored else random.choice(chunks)

# Simulates streaming response from an LLM based on the most relevant chunk of the PDF content.
async def mock_stream_response(document_id: int, question: str, mode: str = "word"):
    chunks = get_pdf_chunks(document_id)

    response = pick_relevant_chunk(chunks, question)

    # -------------------------------
    # CHAR STREAMING (default)
    # -------------------------------
    if mode == "char":
        for char in response:
            yield char

            if char in ".!?":
                await asyncio.sleep(0.05)
            elif char in ",;:":
                await asyncio.sleep(0.12)
            elif char == " ":
                await asyncio.sleep(0.02)
            else:
                await asyncio.sleep(random.uniform(0.001, 0.005))

    # -------------------------------
    # WORD STREAMING
    # -------------------------------
    elif mode == "word":
        words = response.split(" ")

        for word in words:
            yield word + " "  # preserve spacing

            # smarter delay per word
            if word.endswith((".", "!", "?")):
                await asyncio.sleep(0.005)
            elif word.endswith((",", ";", ":")):
                await asyncio.sleep(0.01)
            else:
                await asyncio.sleep(random.uniform(0.02, 0.06))

    # -------------------------------
    # FALLBACK (safe)
    # -------------------------------
    else:
        yield response
