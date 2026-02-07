"""Persistent storage for learning progress using DuckDB."""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Optional
import json
import os

import duckdb


class ProgressStorageService:
    """Persist and retrieve UserProgress using DuckDB."""
    
    def __init__(self, db_path: str | Path | None = None) -> None:
        if db_path is None:
            default_path = Path("/app/data/progress.duckdb")
            db_path = os.getenv("PROGRESS_DB_PATH", str(default_path))
        
        db_path = Path(str(db_path))
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = duckdb.connect(str(db_path))
        self._initialize_schema()

    def _initialize_schema(self) -> None:
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS progress (
                user_id VARCHAR PRIMARY KEY,
                completed_tutorials JSON DEFAULT '[]',
                prediction_attempts JSON DEFAULT '[]',
                achievements_unlocked JSON DEFAULT '[]',
                total_prediction_accuracy DOUBLE DEFAULT 0.0,
                learning_streak_days INTEGER DEFAULT 0,
                last_activity TIMESTAMP
            )
            """
        )

    def get_progress(self, user_id: str):
        from app.models.user_progress import UserProgress, PredictionAttempt
        result = self.conn.execute(
            """
            SELECT user_id, completed_tutorials, prediction_attempts,
                   achievements_unlocked, total_prediction_accuracy,
                   learning_streak_days, last_activity
            FROM progress WHERE user_id = ?
            """,
            [user_id],
        ).fetchone()

        if not result:
            progress = UserProgress(user_id=user_id)
            self.save_progress(progress)
            return progress

        prediction_attempts_raw = json.loads(result[2]) if result[2] else []
        prediction_attempts = [PredictionAttempt(**attempt) for attempt in prediction_attempts_raw]

        return UserProgress(
            user_id=result[0],
            completed_tutorials=json.loads(result[1]) if result[1] else [],
            prediction_attempts=prediction_attempts,
            achievements_unlocked=json.loads(result[3]) if result[3] else [],
            total_prediction_accuracy=result[4] or 0.0,
            learning_streak_days=result[5] or 0,
            last_activity=result[6],
        )

    def save_progress(self, progress):
        from app.models.user_progress import UserProgress
        prediction_attempts = [
            attempt.model_dump(mode="json") for attempt in progress.prediction_attempts
        ]
        
        # Upsert
        existing = self.conn.execute(
            "SELECT 1 FROM progress WHERE user_id = ?",
            [progress.user_id],
        ).fetchone()

        if existing:
            self.conn.execute(
                """
                UPDATE progress
                SET completed_tutorials = ?,
                    prediction_attempts = ?,
                    achievements_unlocked = ?,
                    total_prediction_accuracy = ?,
                    learning_streak_days = ?,
                    last_activity = ?
                WHERE user_id = ?
                """,
                [
                    json.dumps(progress.completed_tutorials),
                    json.dumps(prediction_attempts),
                    json.dumps(progress.achievements_unlocked),
                    progress.total_prediction_accuracy,
                    progress.learning_streak_days,
                    progress.last_activity,
                    progress.user_id,
                ],
            )
        else:
            self.conn.execute(
                """
                INSERT INTO progress
                (user_id, completed_tutorials, prediction_attempts, achievements_unlocked,
                 total_prediction_accuracy, learning_streak_days, last_activity)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    progress.user_id,
                    json.dumps(progress.completed_tutorials),
                    json.dumps(prediction_attempts),
                    json.dumps(progress.achievements_unlocked),
                    progress.total_prediction_accuracy,
                    progress.learning_streak_days,
                    progress.last_activity,
                ],
            )
        
        return progress

    def close(self) -> None:
        self.conn.close()
