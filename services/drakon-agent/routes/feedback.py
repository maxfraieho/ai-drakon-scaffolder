"""POST /feedback — log diagram feedback for future improvement."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class FeedbackRequest(BaseModel):
    diagram_name: str
    feedback: str
    corrected_ir: dict | None = None


@router.post("/feedback")
def feedback(req: FeedbackRequest):
    # TODO: persist feedback to knowledge base for BM25 update
    return {"status": "received", "diagram": req.diagram_name}
