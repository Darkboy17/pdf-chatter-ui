# Use slim image to reduce memory footprint
FROM python:3.11-slim

# Prevent Python from buffering logs
ENV PYTHONUNBUFFERED=1

# Keep Hugging Face assets in a predictable image layer and load the baked model
# at runtime instead of downloading during container startup.
ENV HF_HOME=/root/.cache/huggingface
ENV EMBEDDING_MODEL_NAME=/opt/models/all-MiniLM-L6-v2

WORKDIR /app

# Install system dependencies needed by ML/PDF libraries and health checks.
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for Docker layer caching.
COPY ./requirements.txt ./requirements.txt

# Install Python dependencies.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model into the image so runtime startup does not
# depend on Hugging Face or a third-party mirror being reachable.
RUN python - <<EOF
from sentence_transformers import SentenceTransformer
import sys
import time

model_name = "sentence-transformers/all-MiniLM-L6-v2"
model_path = "/opt/models/all-MiniLM-L6-v2"
last_error = None

for i in range(5):
    try:
        print(f"Downloading model (attempt {i + 1})...")
        model = SentenceTransformer(model_name)
        model.save(model_path)
        print(f"Model saved to {model_path}")
        break
    except Exception as exc:
        last_error = exc
        print("Retrying due to error:", exc)
        time.sleep(5)
else:
    print("Failed to download embedding model:", last_error, file=sys.stderr)
    sys.exit(1)
EOF

# Copy project files after dependencies for better caching.
COPY . .

# Expose API port.
EXPOSE 3003

# Run server.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3003"]
