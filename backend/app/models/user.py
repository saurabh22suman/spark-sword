"""User and UserProgress models for authentication and learning progress tracking.

Following PrepRabbit philosophy:
- No execution of user code
- No inference of real data values
- Only track learning behavior (tutorials completed, terms seen, myths interacted with)
- Evidence-based progress tracking
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class User(BaseModel):
    """User model for authenticated users (Google OAuth).
    
    Attributes:
        id: Unique user identifier from OAuth provider (e.g., "google_123456789")
        email: Validated email address from OAuth
        name: Display name from OAuth provider
        picture: Profile picture URL (optional)
        provider: OAuth provider identifier ("google")
        created_at: Timestamp when user first authenticated
    """

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="OAuth provider user ID (prefixed with provider)")
    email: EmailStr = Field(..., description="User email from OAuth provider")
    name: str = Field(..., description="Display name")
    picture: str | None = Field(default=None, description="Profile picture URL")
    provider: str = Field(..., description="OAuth provider (e.g., 'google')")
    created_at: datetime = Field(default_factory=datetime.now, description="Account creation timestamp")


class UserProgress(BaseModel):
    """Learning progress tracking for users.
    
    Tracks:
    - Which tutorials have been completed
    - Which Spark terms have been encountered through behavior
    - Which myths have been viewed/interacted with
    - Which tutorial groups are unlocked
    
    This model follows the PrepRabbit philosophy:
    - Progress is behavior-based, not time-based
    - Terminology is earned through observation, not front-loaded
    - Myths are discovered through interaction
    
    Attributes:
        user_id: Reference to User.id
        completed_tutorials: List of tutorial IDs completed
        seen_terms: List of Spark terminology IDs user has encountered
        myth_interactions: Dict of myth_id -> interaction metadata
        unlocked_groups: List of tutorial group numbers unlocked
        last_active: Timestamp of last progress update
    """

    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(..., description="User ID this progress belongs to")
    completed_tutorials: list[str] = Field(
        default_factory=list,
        description="Tutorial IDs completed (e.g., ['lazy-eval', 'shuffle-cost'])"
    )
    seen_terms: list[str] = Field(
        default_factory=list,
        description="Terminology IDs encountered through behavior"
    )
    myth_interactions: dict[str, Any] = Field(
        default_factory=dict,
        description="Myth ID -> interaction metadata (viewed, dismissed, etc)"
    )
    unlocked_groups: list[int] = Field(
        default_factory=lambda: [1],  # Group 1 always unlocked
        description="Tutorial group numbers unlocked (default: [1])"
    )
    last_active: datetime = Field(
        default_factory=datetime.now,
        description="Last progress update timestamp"
    )
