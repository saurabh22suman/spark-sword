"""
Feedback API

Collects user feedback, bug reports, and feature requests.
"""

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackSubmission(BaseModel):
    """User feedback submission."""
    category: Literal["bug", "feature", "improvement", "other"]
    rating: Optional[int] = None  # 1-5 stars
    message: str
    email: Optional[EmailStr] = None  # For follow-up


# In-memory storage (replace with database in production)
feedback_store: list[dict] = []


@router.post("")
async def submit_feedback(feedback: FeedbackSubmission):
    """
    Submit user feedback.
    
    In production, this would:
    - Store in database
    - Send notification to team
    - Create GitHub issue for bugs
    - Email confirmation to user
    """
    feedback_entry = {
        "id": len(feedback_store) + 1,
        "timestamp": datetime.now().isoformat(),
        "category": feedback.category,
        "rating": feedback.rating,
        "message": feedback.message,
        "email": feedback.email,
    }
    
    feedback_store.append(feedback_entry)
    
    return {
        "success": True,
        "message": "Thank you for your feedback!",
        "id": feedback_entry["id"]
    }


@router.get("/all")
async def get_all_feedback():
    """
    Get all feedback submissions.
    (In production, this would be admin-only)
    """
    return {
        "total": len(feedback_store),
        "feedback": feedback_store
    }
