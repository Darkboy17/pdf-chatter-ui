# AI PDF Chatter

[Live Demo](https://pdf-chatter-ui.vercel.app) 

## Overview

AI PDF Chatter is an AI-powered application that enables users to **upload PDF documents** and **ask questions interactively** based on the document's content. The app leverages **LlamaIndex** for natural language processing, **FastAPI** for the backend, and **React.js & Tailwind CSS** for a sleek, responsive frontend. **SQLite** is used to manage document metadata, while **Sliplane** handles web service integration.

---

## Features

- **Upload PDFs**: Users can upload documents for processing.
- **AI-Powered Q&A**: Ask questions and receive document-specific answers.
- **FastAPI Backend**: High-performance API for handling document processing.
- **React.js Frontend**: Interactive and responsive UI.
- **SQLite Database**: Efficient storage for document metadata.
- **Dockerized Deployment**: Ensures smooth scalability and portability.

---

## Tech Stack

### Frontend:
- **React.js** - Component-based UI for a seamless experience.
- **Tailwind CSS** - Utility-first CSS framework for styling.

### Backend:
- **FastAPI** - High-performance Python framework for API development.
- **LlamaIndex** - Enables natural language queries on document content.
- **SQLite** - Lightweight database for managing document metadata.
- **Sliplane** - Web service management for seamless API interaction.

### Deployment:
- **Docker** - Containerized deployment for efficiency.
- **Oracle Cloud** - Scalable cloud hosting solution.

---

## Getting Started

### Prerequisites

- Node.js (for frontend)
- Python 3.8+ (for backend)
- Docker (for containerized deployment)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/ai-pdf-chatter.git
   cd ai-pdf-chatter
   ```

2. **Set up the Frontend**:
   ```bash
   cd frontend
   npm install
   ```

3. **Set up the Backend**:
   ```bash
   cd ../backend
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   
   - Create a `.env` file in the backend directory:
     ```env
     DATABASE_URL=sqlite:///./database.db
     SECRET_KEY=your-secret-key
     ```
   
   - Create a `.env.local` file in the frontend directory:
     ```env
     NEXT_PUBLIC_API_URL=http://localhost:8000
     ```

5. **Run the Backend**:
   ```bash
   uvicorn main:app --reload
   ```

6. **Run the Frontend**:
   ```bash
   cd ../frontend
   npm run dev
   ```

7. **Access the App**:
   - Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

---
