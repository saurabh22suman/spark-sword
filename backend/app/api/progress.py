"""
User Progress API

Tracks tutorial completion, predictions, achievements, and learning path.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..models.user_progress import (
    get_user_progress,
    mark_tutorial_complete,
    record_prediction_attempt,
    unlock_achievement,
    ACHIEVEMENTS,
    UserProgress,
    Achievement,
)
from .tutorials import get_learning_path_status

router = APIRouter(prefix="/api/progress", tags=["progress"])


class CompleteTutorialRequest(BaseModel):
    tutorial_id: str
    group_id: Optional[str] = "spark-mental-model"  # Default to first group
    prediction_correct: Optional[bool] = None


class RecordPredictionRequest(BaseModel):
    tutorial_id: str
    selected_index: int
    correct: bool
    time_taken_seconds: Optional[int] = None


class UnlockAchievementRequest(BaseModel):
    achievement_id: str


@router.get("/{user_id}", response_model=UserProgress)
async def get_progress(user_id: str):
    """Get user's complete learning progress."""
    return get_user_progress(user_id)


@router.post("/{user_id}/complete")
async def complete_tutorial(user_id: str, request: CompleteTutorialRequest):
    """Mark a tutorial as complete."""
    progress = mark_tutorial_complete(
        user_id, 
        request.tutorial_id, 
        request.group_id,
        request.prediction_correct
    )
    
    # Check for achievement unlocks and get updated progress
    newly_unlocked = check_and_unlock_achievements(user_id, progress)
    
    # Get fresh progress after achievement unlocks
    updated_progress = get_user_progress(user_id)
    
    return {
        "success": True, 
        "progress": updated_progress,
        "newly_unlocked": newly_unlocked
    }


@router.post("/{user_id}/prediction")
async def record_prediction(user_id: str, request: RecordPredictionRequest):
    """Record a prediction challenge attempt."""
    progress = record_prediction_attempt(
        user_id,
        request.tutorial_id,
        request.selected_index,
        request.correct,
        request.time_taken_seconds
    )
    
    # Check for prediction-related achievements
    newly_unlocked = check_and_unlock_achievements(user_id, progress)
    
    # Get fresh progress after achievement unlocks
    updated_progress = get_user_progress(user_id)
    
    return {
        "success": True, 
        "progress": updated_progress,
        "newly_unlocked": newly_unlocked
    }


@router.get("/{user_id}/learning-path")
async def get_learning_path_with_progress(user_id: str):
    """Get learning path status with user's progress."""
    progress = get_user_progress(user_id)
    path_status = get_learning_path_status(progress.completed_tutorials)
    
    return {
        "groups": path_status,
        "completed_count": len(progress.completed_tutorials),
        "prediction_accuracy": progress.total_prediction_accuracy,
        "achievements_unlocked": len(progress.achievements_unlocked)
    }


@router.get("/{user_id}/achievements")
async def get_achievements(user_id: str):
    """Get all achievements with unlock status."""
    progress = get_user_progress(user_id)
    
    achievements = []
    for achievement_def in ACHIEVEMENTS:
        unlocked = achievement_def.id in progress.achievements_unlocked
        achievements.append({
            "id": achievement_def.id,
            "title": achievement_def.title,
            "description": achievement_def.description,
            "icon_name": achievement_def.icon,
            "unlocked": unlocked,
            "unlocked_at": datetime.now().isoformat() if unlocked else None
        })
    
    return {
        "achievements": achievements,
        "total": len(ACHIEVEMENTS)
    }


@router.post("/{user_id}/achievements/unlock")
async def unlock_achievement_endpoint(user_id: str, request: UnlockAchievementRequest):
    """Manually unlock an achievement (for testing)."""
    progress = unlock_achievement(user_id, request.achievement_id)
    return {"success": True, "progress": progress}


def check_and_unlock_achievements(user_id: str, progress: UserProgress) -> list[str]:
    """
    Check and unlock achievements based on user progress.
    Returns list of newly unlocked achievement IDs.
    """
    newly_unlocked = []
    
    # First tutorial
    if len(progress.completed_tutorials) >= 1 and "first-tutorial" not in progress.achievements_unlocked:
        unlock_achievement(user_id, "first-tutorial")
        newly_unlocked.append("first-tutorial")
    
    # Prediction master (10 consecutive correct)
    if len(progress.prediction_attempts) >= 10:
        recent_10 = progress.prediction_attempts[-10:]
        if all(a.correct for a in recent_10) and "prediction-master" not in progress.achievements_unlocked:
            unlock_achievement(user_id, "prediction-master")
            newly_unlocked.append("prediction-master")
    
    # Perfect score
    if progress.total_prediction_accuracy == 100.0 and len(progress.prediction_attempts) >= 5:
        if "perfect-score" not in progress.achievements_unlocked:
            unlock_achievement(user_id, "perfect-score")
            newly_unlocked.append("perfect-score")
    
    return newly_unlocked
