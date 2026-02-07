"""
User Progress Models

Tracks tutorial completion, predictions, and learning path progress.
Uses persistent DuckDB storage.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.services.progress_storage import ProgressStorageService


class PredictionAttempt(BaseModel):
    """Record of a prediction challenge attempt."""
    tutorial_id: str
    selected_index: int
    correct: bool
    timestamp: datetime
    time_taken_seconds: Optional[int] = None


class TutorialCompletion(BaseModel):
    """Record of tutorial completion."""
    tutorial_id: str
    group_id: str
    completed_at: datetime
    prediction_correct: Optional[bool] = None


class UserProgress(BaseModel):
    """Complete user learning progress."""
    user_id: str
    completed_tutorials: list[str] = []
    prediction_attempts: list[PredictionAttempt] = []
    achievements_unlocked: list[str] = []
    total_prediction_accuracy: float = 0.0
    learning_streak_days: int = 0
    last_activity: Optional[datetime] = None


class Achievement(BaseModel):
    """Achievement/Badge definition."""
    id: str
    title: str
    description: str
    icon: str
    criteria: str  # Human-readable criteria
    unlocked: bool = False
    unlocked_at: Optional[datetime] = None


# Persistent storage (lazy init)
_progress_storage: Optional[ProgressStorageService] = None


def _get_storage() -> ProgressStorageService:
    global _progress_storage
    if _progress_storage is None:
        _progress_storage = ProgressStorageService()
    return _progress_storage


def get_user_progress(user_id: str) -> UserProgress:
    """Get or create user progress."""
    return _get_storage().get_progress(user_id)


def mark_tutorial_complete(user_id: str, tutorial_id: str, group_id: str, prediction_correct: Optional[bool] = None) -> UserProgress:
    """Mark a tutorial as complete."""
    progress = get_user_progress(user_id)
    
    if tutorial_id not in progress.completed_tutorials:
        progress.completed_tutorials.append(tutorial_id)
        progress.last_activity = datetime.now()
    
    _get_storage().save_progress(progress)
    return progress


def record_prediction_attempt(user_id: str, tutorial_id: str, selected_index: int, correct: bool, time_taken: Optional[int] = None) -> UserProgress:
    """Record a prediction challenge attempt."""
    progress = get_user_progress(user_id)
    
    attempt = PredictionAttempt(
        tutorial_id=tutorial_id,
        selected_index=selected_index,
        correct=correct,
        timestamp=datetime.now(),
        time_taken_seconds=time_taken
    )
    
    progress.prediction_attempts.append(attempt)
    
    # Update accuracy
    total_attempts = len(progress.prediction_attempts)
    correct_attempts = sum(1 for a in progress.prediction_attempts if a.correct)
    progress.total_prediction_accuracy = (correct_attempts / total_attempts * 100) if total_attempts > 0 else 0.0
    
    progress.last_activity = datetime.now()
    
    _get_storage().save_progress(progress)
    return progress


def unlock_achievement(user_id: str, achievement_id: str) -> UserProgress:
    """Unlock an achievement for a user."""
    progress = get_user_progress(user_id)
    
    if achievement_id not in progress.achievements_unlocked:
        progress.achievements_unlocked.append(achievement_id)
    
    _get_storage().save_progress(progress)
    return progress


# Achievement definitions
ACHIEVEMENTS: list[Achievement] = [
    Achievement(
        id="first-tutorial",
        title="First Steps",
        description="Complete your first tutorial",
        icon="🎯",
        criteria="Complete 1 tutorial"
    ),
    Achievement(
        id="prediction-master",
        title="Prediction Master",
        description="Get 10 predictions correct in a row",
        icon="🧠",
        criteria="10 consecutive correct predictions"
    ),
    Achievement(
        id="group-1-complete",
        title="Mental Model Mastered",
        description="Complete all tutorials in Group 1",
        icon="🧩",
        criteria="Complete Group 1"
    ),
    Achievement(
        id="expert-unlocked",
        title="Expert Level Unlocked",
        description="Unlock expert tutorial groups (11-15)",
        icon="⚡",
        criteria="Complete Groups 1-10"
    ),
    Achievement(
        id="perfect-score",
        title="Perfect Prediction Score",
        description="100% accuracy on all prediction challenges",
        icon="💯",
        criteria="100% prediction accuracy"
    ),
    Achievement(
        id="speed-learner",
        title="Speed Learner",
        description="Complete 5 tutorials in one day",
        icon="🚀",
        criteria="5 tutorials in 24 hours"
    ),
    Achievement(
        id="spark-expert",
        title="Spark Expert",
        description="Complete all 15 tutorial groups",
        icon="🏆",
        criteria="Complete all groups"
    ),
]
