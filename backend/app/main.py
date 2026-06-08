import os
import logging

from app.core.ai import init_ai
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db

from app.api.routes import auth, pdf, chat, documents
from app.core.firebase_auth import get_current_user

init_ai()

app = FastAPI()



logging.basicConfig(level=logging.INFO)

@app.on_event("startup")
def on_startup():
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(pdf.router)
app.include_router(chat.router)
app.include_router(documents.router)

@app.get("/", response_class=HTMLResponse)
def root():
    return """
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>PDF Chatter API</title>
        <style>
          :root {
            color-scheme: dark;
            --bg: #020617;
            --card: rgba(15, 23, 42, 0.82);
            --card-strong: rgba(15, 23, 42, 0.94);
            --border: rgba(148, 163, 184, 0.22);
            --ink: #f8fafc;
            --muted: #94a3b8;
            --accent: #34d399;
            --accent-strong: #10b981;
          }

          * {
            box-sizing: border-box;
          }

          body {
            min-height: 100vh;
            margin: 0;
            color: var(--ink);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:
              radial-gradient(circle at 14% 8%, rgba(16, 185, 129, 0.18), transparent 28rem),
              radial-gradient(circle at 86% 18%, rgba(59, 130, 246, 0.13), transparent 26rem),
              linear-gradient(135deg, #020617 0%, #07111f 54%, #081b17 100%);
          }

          main {
            display: grid;
            min-height: 100vh;
            place-items: center;
            padding: 2rem;
          }

          .shell {
            width: min(100%, 980px);
            overflow: hidden;
            border: 1px solid var(--border);
            border-radius: 28px;
            background: var(--card);
            box-shadow: 0 30px 100px rgba(0, 0, 0, 0.42);
            backdrop-filter: blur(18px);
          }

          .hero {
            padding: clamp(2rem, 6vw, 4.75rem);
          }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.55rem;
            border: 1px solid rgba(52, 211, 153, 0.28);
            border-radius: 999px;
            background: rgba(6, 78, 59, 0.34);
            padding: 0.5rem 0.8rem;
            color: #a7f3d0;
            font-size: 0.78rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .pulse {
            width: 0.55rem;
            height: 0.55rem;
            border-radius: 999px;
            background: var(--accent);
            box-shadow: 0 0 0 6px rgba(52, 211, 153, 0.14);
          }

          h1 {
            max-width: 760px;
            margin: 1.5rem 0 0;
            font-size: clamp(2.3rem, 8vw, 5.1rem);
            line-height: 0.98;
            letter-spacing: -0.045em;
          }

          .lead {
            max-width: 660px;
            margin: 1.35rem 0 0;
            color: var(--muted);
            font-size: clamp(1rem, 2vw, 1.16rem);
            line-height: 1.8;
          }

          .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.85rem;
            margin-top: 2rem;
          }

          a {
            color: inherit;
            text-decoration: none;
          }

          .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 2.9rem;
            border-radius: 14px;
            padding: 0 1rem;
            font-weight: 700;
            transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
          }

          .button:hover {
            transform: translateY(-1px);
          }

          .primary {
            background: var(--accent-strong);
            color: #ecfdf5;
            box-shadow: 0 18px 42px rgba(16, 185, 129, 0.22);
          }

          .secondary {
            border: 1px solid var(--border);
            background: rgba(15, 23, 42, 0.72);
            color: #dbeafe;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            border-top: 1px solid var(--border);
            background: var(--card-strong);
          }

          .tile {
            min-height: 132px;
            padding: 1.35rem;
            border-right: 1px solid var(--border);
          }

          .tile:last-child {
            border-right: 0;
          }

          .label {
            color: var(--muted);
            font-size: 0.74rem;
            font-weight: 800;
            letter-spacing: 0.14em;
            text-transform: uppercase;
          }

          .value {
            margin-top: 0.65rem;
            font-size: 1.05rem;
            font-weight: 750;
          }

          .hint {
            margin-top: 0.45rem;
            color: var(--muted);
            font-size: 0.92rem;
            line-height: 1.55;
          }

          code {
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 8px;
            background: rgba(2, 6, 23, 0.5);
            padding: 0.12rem 0.36rem;
            color: #6ee7b7;
          }

          @media (max-width: 760px) {
            main {
              padding: 1rem;
            }

            .shell {
              border-radius: 22px;
            }

            .grid {
              grid-template-columns: 1fr;
            }

            .tile {
              border-right: 0;
              border-bottom: 1px solid var(--border);
            }

            .tile:last-child {
              border-bottom: 0;
            }
          }
        </style>
      </head>
      <body>
        <main>
          <section class="shell" aria-labelledby="welcome-title">
            <div class="hero">
              <span class="badge"><span class="pulse"></span> API online</span>
              <h1 id="welcome-title">Welcome to PDF Chatter</h1>
              <p class="lead">
                The backend service is running and ready to power authenticated PDF uploads,
                document retrieval, and streaming question-answer conversations.
              </p>
              <div class="actions" aria-label="Useful links">
                <a class="button primary" href="/docs">Open API docs</a>
                <a class="button secondary" href="http://127.0.0.1:3000/login">Go to app</a>
              </div>
            </div>
            <div class="grid" aria-label="Service summary">
              <div class="tile">
                <div class="label">Service</div>
                <div class="value">PDF Chatter API</div>
                <div class="hint">FastAPI backend for the document chat workspace.</div>
              </div>
              <div class="tile">
                <div class="label">Status</div>
                <div class="value">Healthy</div>
                <div class="hint">Root endpoint served successfully from <code>/</code>.</div>
              </div>
              <div class="tile">
                <div class="label">Next step</div>
                <div class="value">Upload and ask</div>
                <div class="hint">Use the frontend to upload PDFs and start a grounded chat.</div>
              </div>
            </div>
          </section>
        </main>
      </body>
    </html>
    """

# Endpoint to check if API key has been provided
@app.get("/check-api-key/")
async def check_api_key(current_user=Depends(get_current_user)):
    api_key = os.getenv("GROQ_API_KEY")  # Get the API key from environment variables
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is missing or invalid.")
    return {"message": "API key is present."}
