import os

if os.getenv("HF_ENDPOINT", "").rstrip("/") == "https://hf-mirror.com":
    os.environ.pop("HF_ENDPOINT", None)

import httpx
from llama_index.core import Settings as LlamaSettings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.groq import Groq

from app.core.config import settings
from app.core.tls import system_ssl_context


def build_groq_llm(model: str) -> Groq:
    return Groq(
        model=model,
        api_key=settings.GROQ_API_KEY,
        http_client=httpx.Client(verify=system_ssl_context()),
        async_http_client=httpx.AsyncClient(verify=system_ssl_context()),
    )


def init_ai():
    LlamaSettings.embed_model = HuggingFaceEmbedding(
        model_name=settings.EMBEDDING_MODEL_NAME
    )

    LlamaSettings.llm = build_groq_llm("llama-3.3-70b-versatile")
