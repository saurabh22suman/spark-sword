"""
Feedback API

Collects user feedback, bug reports, and feature requests.
Optionally sends email notification via SMTP.
"""

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime
import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

FEEDBACK_RECIPIENT = "saurabh22suman@gmail.com"


class FeedbackSubmission(BaseModel):
    """User feedback submission."""
    category: Literal["bug", "feature", "improvement", "general"]
    rating: Optional[int] = None  # 1-5 stars
    message: str
    email: Optional[EmailStr] = None  # For follow-up
    page: Optional[str] = None  # Which page the feedback is from


# In-memory storage (replace with database in production)
feedback_store: list[dict] = []


def _send_email_notification(entry: dict) -> bool:
    """Send email notification for new feedback. Returns True if sent."""
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_email or not smtp_password:
        logger.info("SMTP not configured — skipping email notification")
        return False

    try:
        category_emoji = {
            "bug": "🐛", "feature": "✨",
            "improvement": "💡", "general": "💬",
        }.get(entry["category"], "📝")

        stars = ""
        if entry.get("rating"):
            stars = f"\nRating: {'⭐' * entry['rating']} ({entry['rating']}/5)"

        body = f"""
New feedback received on PrepRabbit!

{category_emoji} Category: {entry['category'].title()}
{stars}
Page: {entry.get('page', 'Unknown')}
Time: {entry['timestamp']}

Message:
{entry['message']}

Reply-to: {entry.get('email', 'Not provided')}
        """.strip()

        msg = MIMEMultipart()
        msg["From"] = smtp_email
        msg["To"] = FEEDBACK_RECIPIENT
        msg["Subject"] = f"{category_emoji} PrepRabbit Feedback: {entry['category'].title()}"
        if entry.get("email"):
            msg["Reply-To"] = entry["email"]
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(smtp_email, smtp_password)
            server.send_message(msg)

        logger.info(f"Feedback email sent for #{entry['id']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send feedback email: {e}")
        return False


@router.post("")
async def submit_feedback(feedback: FeedbackSubmission):
    """Submit user feedback. Stores locally and optionally emails notification."""
    feedback_entry = {
        "id": len(feedback_store) + 1,
        "timestamp": datetime.now().isoformat(),
        "category": feedback.category,
        "rating": feedback.rating,
        "message": feedback.message,
        "email": feedback.email,
        "page": feedback.page,
    }

    feedback_store.append(feedback_entry)

    email_sent = _send_email_notification(feedback_entry)

    return {
        "success": True,
        "message": "Thank you for your feedback!",
        "id": feedback_entry["id"],
        "email_sent": email_sent,
    }


@router.get("/all")
async def get_all_feedback():
    """Get all feedback submissions. (Admin-only in production)"""
    return {
        "total": len(feedback_store),
        "feedback": feedback_store,
    }
