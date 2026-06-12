# PDF Chatter

PDF Chatter is a full-stack document chat application for uploading PDFs, indexing
their text, and asking grounded questions about the selected document. The current
refactor separates the application into a FastAPI backend, a React frontend, and
small backend modules for configuration, authentication, persistence, PDF parsing,
vector indexing, and chat streaming.

The app uses Firebase email/password authentication for user identity, HttpOnly
cookies for browser sessions, SQLite for document metadata, ChromaDB for persistent
vector storage, PyMuPDF for PDF extraction, LlamaIndex for retrieval/chat
orchestration, Hugging Face sentence-transformer embeddings, and Groq-hosted LLMs
for answer generation.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Repository Layout](#repository-layout)
- [Backend Flow](#backend-flow)
- [Frontend Flow](#frontend-flow)
- [Local Prerequisites](#local-prerequisites)
- [Environment Variables](#environment-variables)
- [Run Locally](#run-locally)
- [API Reference](#api-reference)
- [Storage and Runtime Data](#storage-and-runtime-data)
- [Authentication and Sessions](#authentication-and-sessions)
- [PDF Indexing and Chat Behavior](#pdf-indexing-and-chat-behavior)
- [Testing and Verification](#testing-and-verification)
- [Deployment Notes](#deployment-notes)
- [Troubleshooting](#troubleshooting)
- [Development Notes](#development-notes)

## Features

- Email/password sign up, login, logout, session restore, and token refresh through
  Firebase Authentication.
- HttpOnly session cookies so frontend JavaScript does not need to store Firebase
  tokens directly.
- Per-user document isolation through a stable internal `session_id` mapped to each
  Firebase UID.
- PDF upload with duplicate detection based on a user-scoped file hash.
- PDF text extraction and metadata extraction with PyMuPDF.
- Persistent uploaded files under a hashed owner directory.
- Persistent Chroma vector collections per user session and document.
- LlamaIndex retrieval over PDF pages with chunking and overlap.
- Streaming answers over server-sent events.
- Optional source snippets when the user's question asks for citations, proof,
  verification, quotes, references, or page/source evidence.
- React dashboard with dark/light theme persistence, upload state, document picker,
  delete confirmation, streaming chat messages, and markdown/math/code rendering.

## Architecture

```text
Browser
  |
  | React app, cookies, uploads, SSE chat stream
  v
Frontend: frontend/
  |
  | /api proxy in local development or deployed backend URL in production
  v
Backend: backend/app/
  |
  | Auth routes -> Firebase Identity Toolkit
  | PDF routes  -> PyMuPDF + SQLite + ChromaDB
  | Chat routes -> LlamaIndex + Hugging Face embeddings + Groq LLM
  v
Runtime data
  - backend/database.db
  - backend/uploads/
  - backend/chroma_db/
```

The backend is intentionally organized by responsibility:

- `app/main.py` creates the FastAPI application, configures CORS, initializes AI
  settings, initializes the database on startup, and registers routers.
- `app/api/routes/` contains HTTP endpoints for auth, uploads, documents, and chat.
- `app/core/` contains configuration, database lifecycle, Firebase verification,
  Groq/LlamaIndex setup, and TLS handling.
- `app/repositories/` contains direct SQLite access for users and documents.
- `app/services/` contains PDF parsing, vector indexing, chat streaming, and helper
  service logic.
- `app/models/` contains request/response schemas.

## Repository Layout

```text
pdf-chatter/
  backend/
    app/
      api/routes/
        auth.py          # signup, login, refresh, logout, current user
        chat.py          # document-scoped streaming question endpoint
        documents.py     # list, select, and delete uploaded PDFs
        pdf.py           # upload, parse, persist, and index PDFs
      core/
        ai.py            # LlamaIndex embedding and Groq LLM configuration
        config.py        # environment-backed settings
        database.py      # SQLite schema creation and migrations
        firebase_auth.py # Firebase token lookup and current-user dependency
        tls.py           # shared TLS context for outbound HTTP clients
      models/
        schemas.py       # Pydantic request/response models
      repositories/
        document_repo.py # document persistence
        user_repo.py     # Firebase UID to internal session mapping
      services/
        chat_service.py  # SSE streaming, prompts, citation selection
        pdf_service.py   # PDF storage, text extraction, metadata extraction
        vector_service.py# Chroma/LlamaIndex collection management
      main.py
    Dockerfile
    requirements.txt
    .env.example
  frontend/
    public/
    scripts/
      start.js           # CRA compatibility wrapper for local development
      build.js           # CRA compatibility wrapper for production builds
    src/
      components/
        AskQuestion.js
        AuthForm.js
        MarkdownResponse.js
        UploadedPDFList.js
        UploadPDF.js
      api.js             # axios client with credentials and long timeout
      App.js
      index.js           # sets window.backendURL
    package.json
    vercel.json
    .env.example
```

## Backend Flow

### Startup

1. `app.main` loads application settings from environment variables.
2. `init_ai()` configures the global LlamaIndex embedding model and default Groq LLM.
3. FastAPI starts and calls `init_db()`.
4. SQLite creates or migrates the `users` and `documents` tables.
5. Routers for auth, upload, chat, and documents are registered.

### Upload

1. The browser sends `POST /upload-pdf/` as multipart form data.
2. `get_current_user` validates the HttpOnly Firebase ID-token cookie with Firebase.
3. The backend reads the PDF bytes and rejects non-PDF content types.
4. A SHA-256 hash is computed from `user_id + ":" + file_bytes`.
5. The document repository checks for an existing row with the same hash in the same
   internal session.
6. The file is saved to `uploads/<hashed-session-id>/<file-hash>.pdf`.
7. PyMuPDF extracts page text and metadata.
8. SQLite stores filename, extracted text, metadata JSON, owner UID, session ID, and
   storage path.
9. ChromaDB stores a fresh vector index for that document.
10. If database, vector, or file operations fail after partial work, the upload route
    attempts to clean up the inserted row, vector collection, and saved file.

### Chat

1. The browser sends `POST /ask-question/` with `question`, `document_id`, and an
   optional `conversation_id`.
2. The backend confirms the document belongs to the current user's session.
3. Metadata is read from the database, or re-extracted from the PDF if missing.
4. The Chroma collection is loaded. If it is empty or has an older index version, it
   is rebuilt from the stored PDF/text.
5. A per-document, per-conversation `ChatMemoryBuffer` is created or reused.
6. `chat_service.stream_chat` returns a `text/event-stream` response with events:
   `start`, `delta`, optional `sources`, `done`, or `error`.

## Frontend Flow

The React app is created with Create React App and styled with Tailwind CSS plus
custom CSS.

1. `src/index.js` sets `window.backendURL` from `REACT_APP_BACKEND_URL`, defaulting to
   `/api`.
2. `src/api.js` creates an axios client with `withCredentials: true` and a five-minute
   timeout for long uploads/indexing.
3. `App.js` restores a session by calling `/auth/me`, then attempts `/auth/refresh`
   before sending unauthenticated users to `/login`.
4. Authenticated users see the dashboard:
   - `UploadPDF` uploads a PDF and refreshes document state.
   - `UploadedPDFList` lists, selects, and deletes documents.
   - `AskQuestion` uses `fetch` directly for the SSE stream.
   - `MarkdownResponse` renders markdown, math, and highlighted code.
5. The theme preference is stored in local storage under `pdf-chatter-theme`.

Local development usually sets `REACT_APP_BACKEND_URL=/api`, and `setupProxy.js`
forwards `/api/*` to `BACKEND_PROXY_URL` or `http://localhost:8000`.

## Local Prerequisites

- Node.js and npm for the React frontend.
- Python 3.11 is recommended for the backend. The Dockerfile also uses Python 3.11.
- A Firebase project with Email/Password sign-in enabled.
- A Firebase Web API key from the Firebase project settings.
- A Groq API key.
- Network access during first backend startup or image build to download the configured
  Hugging Face embedding model, unless the model is already cached or baked into the
  image.

## Environment Variables

### Backend

Create `backend/.env` from `backend/.env.example`.

```env
GROQ_API_KEY=your-groq-api-key
FIREBASE_WEB_API_KEY=your-firebase-web-api-key
CORS_ORIGINS=http://localhost:3000
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=lax
SESSION_REFRESH_COOKIE_NAME=pdf_chatter_session_refresh
SESSION_REFRESH_COOKIE_MAX_AGE_SECONDS=31536000
```

Supported backend settings:

| Variable | Default | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | none | Required for Groq-backed LLM responses. |
| `FIREBASE_WEB_API_KEY` | none | Required for signup, login, token refresh, and token lookup. |
| `SESSION_COOKIE_NAME` | `pdf_chatter_session` | Cookie name for the short-lived Firebase ID token. |
| `SESSION_REFRESH_COOKIE_NAME` | `<SESSION_COOKIE_NAME>_refresh` | Cookie name for the long-lived Firebase refresh token. |
| `SESSION_REFRESH_COOKIE_MAX_AGE_SECONDS` | `31536000` | Refresh cookie lifetime, clamped to at least one day. |
| `SESSION_COOKIE_SECURE` | `false` | Set to `true` when serving over HTTPS. |
| `SESSION_COOKIE_SAMESITE` | `lax` | Must be `strict`, `lax`, or `none`; invalid values fall back to `lax`. |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed frontend origins. |
| `EMBEDDING_MODEL_NAME` | `sentence-transformers/all-MiniLM-L6-v2` | Hugging Face model name or local model path. |

The following backend paths are currently configured in `app/core/config.py`:

| Setting | Value | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `database.db` | SQLite database path relative to the backend process working directory. |
| `UPLOADS_DIR` | `uploads` | Uploaded PDF storage directory. |
| `CHROMA_DIR` | `chroma_db` | Persistent ChromaDB directory. |

### Frontend

Create `frontend/.env.local` from `frontend/.env.example`.

```env
REACT_APP_BACKEND_URL=/api
BACKEND_PROXY_URL=http://localhost:8000
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `REACT_APP_BACKEND_URL` | `/api` | Browser-facing backend base URL stored as `window.backendURL`. |
| `BACKEND_PROXY_URL` | `http://localhost:8000` | CRA dev-server proxy target for `/api` requests. |

For deployed frontends, set `REACT_APP_BACKEND_URL` to the public backend URL if the
frontend is not proxying `/api` to the backend.

## Run Locally

Use two terminals: one for the backend and one for the frontend.

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env` with your Firebase and Groq keys, then start FastAPI:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Useful backend URLs:

- App landing page: `http://localhost:8000/`
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

### 2. Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
npm start
```

Open `http://localhost:3000`.

The default local setup keeps `REACT_APP_BACKEND_URL=/api`; the CRA proxy then forwards
requests to `http://localhost:8000`. This helps cookies behave as first-party cookies
during local development.

## API Reference

All document and chat endpoints require the user to be authenticated through the
server-managed cookies unless noted otherwise.

### Public and Health-Like Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | HTML landing page showing that the API is online. |
| `GET` | `/docs` | FastAPI Swagger UI. |

### Auth

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | `{ "email": "...", "password": "..." }` | Creates a Firebase user and sets session cookies. |
| `POST` | `/auth/login` | `{ "email": "...", "password": "..." }` | Signs in through Firebase and sets session cookies. |
| `POST` | `/auth/refresh` | none | Uses the refresh cookie to rotate both auth cookies. |
| `POST` | `/auth/logout` | none | Deletes auth cookies. |
| `GET` | `/auth/me` | none | Returns the current user's UID, email, and token expiry. |

### Documents and Uploads

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/upload-pdf/` | Uploads, extracts, stores, and indexes one PDF file. |
| `GET` | `/documents/` | Returns document IDs and filenames for the current session. |
| `GET` | `/get-all-documents` | Returns a status wrapper and all documents, or `404` if none exist. |
| `GET` | `/get-document-id/?filename=<name>` | Resolves the newest matching filename to a document ID. |
| `GET` | `/books/` | Returns uploaded filenames, or `404` if none exist. |
| `GET` | `/list-uploads/` | Returns an array of uploaded filenames. |
| `DELETE` | `/delete-pdf/{document_id}` | Deletes the PDF file, vector collection, and database row. |

### Chat

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/ask-question/` | `{ "question": "...", "document_id": 1, "conversation_id": "..." }` | Streams an answer for the selected document. |

`/ask-question/` returns server-sent events:

```text
event: start
data: {"started": true}

event: delta
data: {"delta": "partial token text"}

event: sources
data: {"sources": [{"filename": "...", "page_number": 1, "excerpt": "..."}]}

event: done
data: {"done": true}
```

The `sources` event is only emitted when the user asks for citations, proof,
references, quotes, page information, verification, or similar evidence.

### Configuration Check

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/check-api-key/` | Authenticated endpoint that verifies `GROQ_API_KEY` is configured. |

## Storage and Runtime Data

Runtime data is intentionally ignored by git:

- `backend/database.db`
- `backend/uploads/`
- `backend/chroma_db/`
- `backend/venv/`
- `frontend/node_modules/`
- `frontend/build/`
- local `.env` files and Firebase admin SDK JSON files

Uploaded files are saved by session, not directly by email or UID:

```text
backend/uploads/<sha256(session_id)>/<file_hash>.pdf
```

Vector collections are named:

```text
session_<session_id>_document_<document_id>
```

The current vector index version is defined in `vector_service.py` as
`grounded-chat-v2`. If a collection is empty or has a different version, it is rebuilt
when the document is used for chat.

## Authentication and Sessions

The application uses Firebase Identity Toolkit endpoints directly from the backend:

- `accounts:signUp`
- `accounts:signInWithPassword`
- `accounts:lookup`
- `securetoken.googleapis.com/v1/token`

On successful signup/login, the backend sets two HttpOnly cookies:

- `pdf_chatter_session` by default: stores the Firebase ID token and expires when the
  token expires.
- `pdf_chatter_session_refresh` by default: stores the Firebase refresh token and is
  scoped to `/auth`.

The frontend automatically refreshes the session shortly before expiry. If refresh
fails with `401`, the frontend returns the user to the login screen.

For production HTTPS deployments, set:

```env
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=none
```

Use `SameSite=none` only when cross-site cookies are required, and make sure the
backend is served over HTTPS because browsers require `Secure` for that mode.

## PDF Indexing and Chat Behavior

- PDFs must be uploaded with content type `application/pdf`.
- The UI currently tells users to keep PDFs at or below 1 MB. The backend does not
  enforce this limit by itself; deployment infrastructure may still impose request
  size limits.
- Empty or image-only PDFs fail with `No readable text found in this PDF.`
- Page-level text is preserved for vector indexing so source snippets can include page
  numbers when available.
- The chat service treats PDF text and metadata as untrusted content and instructs the
  model to ignore prompt-injection attempts inside uploaded documents.
- Social messages such as "hi" are answered without forcing document retrieval.
- Document identification and outline-style questions are rewritten into more useful
  retrieval prompts before querying the PDF.
- Conversation memory is stored in process memory in `chat_sessions`. Restarting the
  backend clears active chat memory but does not remove documents or vector indexes.

## Testing and Verification

### Frontend build

```bash
cd frontend
npm run build
```

### Frontend tests

```bash
cd frontend
npm test
```

The frontend scripts wrap `react-scripts` to keep current Node/webpack-dev-server
behavior compatible with this Create React App version.

### Backend smoke checks

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then open:

- `http://localhost:8000/`
- `http://localhost:8000/docs`

There is no dedicated backend test suite in the repository at the moment. For manual
end-to-end verification, sign up or log in, upload a small text-based PDF, ask a
question, ask a follow-up, request a citation, then delete the PDF.

## Deployment Notes

### Backend Docker Image

The backend `Dockerfile`:

- uses `python:3.11-slim`;
- installs requirements;
- downloads `sentence-transformers/all-MiniLM-L6-v2` at build time;
- saves that model to `/opt/models/all-MiniLM-L6-v2`;
- sets `EMBEDDING_MODEL_NAME=/opt/models/all-MiniLM-L6-v2`;
- exposes port `3003`;
- runs `uvicorn app.main:app --host 0.0.0.0 --port 3003`.

Build and run locally:

```bash
cd backend
docker build -t pdf-chatter-backend .
docker run --env-file .env -p 3003:3003 pdf-chatter-backend
```

Make sure persistent storage is configured for:

- `/app/database.db`
- `/app/uploads`
- `/app/chroma_db`

Without persistent storage, documents and indexes can disappear when the container is
recreated.

### Frontend

The frontend includes `vercel.json` that rewrites all paths to `index.html`, which
supports client-side routes such as `/login` and `/dashboard`.

For production, configure:

```env
REACT_APP_BACKEND_URL=https://your-backend.example.com
```

Also configure backend CORS:

```env
CORS_ORIGINS=https://your-frontend.example.com
```

When frontend and backend are on different sites and cookies are used, production
cookie and CORS settings must be aligned:

- backend `allow_credentials=True` is already enabled;
- `CORS_ORIGINS` must list the exact frontend origin;
- `SESSION_COOKIE_SECURE=true`;
- `SESSION_COOKIE_SAMESITE=none` if the browser treats the frontend/backend as
  cross-site.

## Troubleshooting

### `Firebase authentication is not configured on the server.`

Set `FIREBASE_WEB_API_KEY` in `backend/.env` and restart the backend.

### `API key is missing or invalid.`

Set `GROQ_API_KEY` in `backend/.env` and restart the backend.

### Login works but `/auth/me` fails after refresh

Check cookie settings. In local development, `SESSION_COOKIE_SECURE=false` and
`SESSION_COOKIE_SAMESITE=lax` are usually appropriate. In HTTPS cross-site production,
use `SESSION_COOKIE_SECURE=true` and often `SESSION_COOKIE_SAMESITE=none`.

### Frontend cannot reach the backend locally

Confirm these values:

```env
REACT_APP_BACKEND_URL=/api
BACKEND_PROXY_URL=http://localhost:8000
```

Then restart `npm start`. The CRA dev server only reads environment variables at
startup.

### Chat stream fails

Check that:

- the backend is reachable from the browser at `window.backendURL`;
- the user is logged in and cookies are included;
- `GROQ_API_KEY` is set;
- the selected document exists for the current user;
- the backend logs do not show an LLM or vector-indexing exception.

### Upload times out

The frontend upload timeout is five minutes. Large PDFs, cold embedding model loads,
or slow deployments can exceed that. Try a smaller text-based PDF first. The UI
currently communicates a 1 MB recommendation.

### Image-only PDFs have no answerable text

PyMuPDF extracts embedded text. Scanned/image-only PDFs need OCR before this app can
index their contents.

### Hugging Face model download fails

The backend initializes the embedding model during startup. Ensure the machine has
network access or set `EMBEDDING_MODEL_NAME` to a local model path that already exists.
The Dockerfile bakes the default embedding model into the image to avoid runtime
downloads in production.

## Development Notes

- Keep API routes thin and place reusable logic in services or repositories.
- Keep direct SQLite statements in repository modules.
- Treat `session_id` as the app's internal document isolation key.
- If changing vector chunking, prompts, metadata behavior, or embedding models,
  update `INDEX_VERSION` in `vector_service.py` when existing Chroma collections should
  be rebuilt.
- Do not commit runtime data, local secrets, generated builds, virtual environments,
  or dependency folders.
- Prefer adding backend tests around services and repositories before broad route
  changes, because those modules now contain most of the refactored behavior.
