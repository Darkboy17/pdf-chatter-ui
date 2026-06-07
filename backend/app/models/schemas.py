from pydantic import BaseModel, EmailStr, Field


class AuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)

class QueryRequest(BaseModel):
    question: str
    document_id: int
    conversation_id: str | None = Field(default=None, max_length=64)

class DocumentResponse(BaseModel):
    id: int
    filename: str
