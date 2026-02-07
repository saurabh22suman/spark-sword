"""User Storage Service using DuckDB.

Handles persistence of User and UserProgress data following the
PrepRabbit philosophy of evidence-based progress tracking.

This service:
- Stores authenticated user data from OAuth
- Tracks learning progress (tutorials, terms, myths, groups)
- Provides CRUD operations for users and progress
- Uses DuckDB for lightweight, SQL-based persistence
"""

from pathlib import Path
from typing import Optional
import json
from datetime import datetime

import duckdb

from app.models.user import User, UserProgress


class UserStorageService:
    """Service for storing and retrieving user data and progress using DuckDB."""

    def __init__(self, db_path: str | Path | None = None) -> None:
        """Initialize DuckDB connection for user storage.

        Args:
            db_path: Path to the database file. Uses in-memory DB if None.
        """
        if db_path:
            self.conn = duckdb.connect(str(db_path))
        else:
            self.conn = duckdb.connect(":memory:")
        
        self._initialize_schema()

    def _initialize_schema(self) -> None:
        """Create database tables for user data and progress."""
        # Users table
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR PRIMARY KEY,
                email VARCHAR UNIQUE NOT NULL,
                name VARCHAR NOT NULL,
                picture VARCHAR,
                provider VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # User progress table
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS user_progress (
                user_id VARCHAR PRIMARY KEY,
                completed_tutorials JSON DEFAULT '[]',
                seen_terms JSON DEFAULT '[]',
                myth_interactions JSON DEFAULT '{}',
                unlocked_groups JSON DEFAULT '[1]',
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

    def create_user(self, user: User) -> User:
        """Create a new user in the database.

        Args:
            user: User model to persist

        Returns:
            The created user

        Raises:
            Exception: If user ID or email already exists
        """
        self.conn.execute(
            """
            INSERT INTO users (id, email, name, picture, provider, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                user.id,
                user.email,
                user.name,
                user.picture,
                user.provider,
                user.created_at,
            ],
        )
        return user

    def get_user(self, user_id: str) -> Optional[User]:
        """Retrieve a user by ID.

        Args:
            user_id: Unique user identifier

        Returns:
            User model if found, None otherwise
        """
        result = self.conn.execute(
            "SELECT id, email, name, picture, provider, created_at FROM users WHERE id = ?",
            [user_id],
        ).fetchone()

        if not result:
            return None

        return User(
            id=result[0],
            email=result[1],
            name=result[2],
            picture=result[3],
            provider=result[4],
            created_at=result[5],
        )

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Retrieve a user by email address.

        Args:
            email: User email address

        Returns:
            User model if found, None otherwise
        """
        result = self.conn.execute(
            "SELECT id, email, name, picture, provider, created_at FROM users WHERE email = ?",
            [email],
        ).fetchone()

        if not result:
            return None

        return User(
            id=result[0],
            email=result[1],
            name=result[2],
            picture=result[3],
            provider=result[4],
            created_at=result[5],
        )

    def create_progress(self, progress: UserProgress) -> UserProgress:
        """Create initial progress record for a user.

        Args:
            progress: UserProgress model to persist

        Returns:
            The created progress record
        """
        self.conn.execute(
            """
            INSERT INTO user_progress 
            (user_id, completed_tutorials, seen_terms, myth_interactions, unlocked_groups, last_active)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                progress.user_id,
                json.dumps(progress.completed_tutorials),
                json.dumps(progress.seen_terms),
                json.dumps(progress.myth_interactions),
                json.dumps(progress.unlocked_groups),
                progress.last_active,
            ],
        )
        return progress

    def get_progress(self, user_id: str) -> Optional[UserProgress]:
        """Retrieve progress for a user.

        Args:
            user_id: User ID to get progress for

        Returns:
            UserProgress model if found, None otherwise
        """
        result = self.conn.execute(
            """
            SELECT user_id, completed_tutorials, seen_terms, 
                   myth_interactions, unlocked_groups, last_active
            FROM user_progress 
            WHERE user_id = ?
            """,
            [user_id],
        ).fetchone()

        if not result:
            return None

        return UserProgress(
            user_id=result[0],
            completed_tutorials=json.loads(result[1]) if result[1] else [],
            seen_terms=json.loads(result[2]) if result[2] else [],
            myth_interactions=json.loads(result[3]) if result[3] else {},
            unlocked_groups=json.loads(result[4]) if result[4] else [1],
            last_active=result[5],
        )

    def update_progress(self, progress: UserProgress) -> UserProgress:
        """Update user progress.

        Args:
            progress: UserProgress model with updated data

        Returns:
            The updated progress record
        """
        # Update last_active to now
        progress.last_active = datetime.now()

        self.conn.execute(
            """
            UPDATE user_progress 
            SET completed_tutorials = ?,
                seen_terms = ?,
                myth_interactions = ?,
                unlocked_groups = ?,
                last_active = ?
            WHERE user_id = ?
            """,
            [
                json.dumps(progress.completed_tutorials),
                json.dumps(progress.seen_terms),
                json.dumps(progress.myth_interactions),
                json.dumps(progress.unlocked_groups),
                progress.last_active,
                progress.user_id,
            ],
        )
        return progress

    def close(self) -> None:
        """Close the database connection."""
        self.conn.close()
