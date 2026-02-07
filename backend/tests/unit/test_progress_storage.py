"""Tests for persistent progress storage using DuckDB."""

from datetime import datetime

from app.models.user_progress import UserProgress, PredictionAttempt
from app.services.progress_storage import ProgressStorageService


def test_progress_storage_creates_default(tmp_path):
    db_path = tmp_path / "progress.duckdb"
    storage = ProgressStorageService(db_path=str(db_path))
    
    progress = storage.get_progress("user-1")
    assert progress.user_id == "user-1"
    assert progress.completed_tutorials == []
    assert progress.prediction_attempts == []
    
    # Re-open storage to ensure persistence
    storage.close()
    storage2 = ProgressStorageService(db_path=str(db_path))
    progress2 = storage2.get_progress("user-1")
    assert progress2.user_id == "user-1"
    assert progress2.completed_tutorials == []
    storage2.close()


def test_progress_storage_persists_updates(tmp_path):
    db_path = tmp_path / "progress.duckdb"
    storage = ProgressStorageService(db_path=str(db_path))
    
    progress = UserProgress(
        user_id="user-2",
        completed_tutorials=["t1", "t2"],
        achievements_unlocked=["first-tutorial"],
        total_prediction_accuracy=75.0,
    )
    storage.save_progress(progress)
    storage.close()
    
    storage2 = ProgressStorageService(db_path=str(db_path))
    loaded = storage2.get_progress("user-2")
    assert loaded.completed_tutorials == ["t1", "t2"]
    assert loaded.achievements_unlocked == ["first-tutorial"]
    assert loaded.total_prediction_accuracy == 75.0
    storage2.close()


def test_progress_storage_persists_prediction_attempts(tmp_path):
    db_path = tmp_path / "progress.duckdb"
    storage = ProgressStorageService(db_path=str(db_path))
    
    attempt = PredictionAttempt(
        tutorial_id="t1",
        selected_index=2,
        correct=True,
        timestamp=datetime(2026, 2, 7, 10, 0, 0),
        time_taken_seconds=42,
    )
    
    progress = UserProgress(
        user_id="user-3",
        prediction_attempts=[attempt],
        total_prediction_accuracy=100.0,
    )
    storage.save_progress(progress)
    storage.close()
    
    storage2 = ProgressStorageService(db_path=str(db_path))
    loaded = storage2.get_progress("user-3")
    assert len(loaded.prediction_attempts) == 1
    assert loaded.prediction_attempts[0].tutorial_id == "t1"
    assert loaded.prediction_attempts[0].time_taken_seconds == 42
    storage2.close()
