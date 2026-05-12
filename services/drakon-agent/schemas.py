from pydantic import BaseModel
from typing import Optional


class AnalyzeRequest(BaseModel):
    code: str
    filename: Optional[str] = "module.py"


class AnalyzeResponse(BaseModel):
    diagrams: list[dict]
    count: int
    filename: str


class FeedbackRequest(BaseModel):
    diagram_id: str
    feedback: str


class FeedbackResponse(BaseModel):
    status: str
    message: str
