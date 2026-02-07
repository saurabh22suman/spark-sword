"""Tests for User Storage Service using DuckDB.

Following TDD Red-Green-Refactor-Verify:
- Tests define expected behavior for user CRUD operations
- Tests use in-memory DuckDB for isolation
- Tests validate data persistence and retrieval
- No Spark behavior involved - this is pure data storage
"""

import pytest
from datetime import datetime

from app.services.user_storage import UserStorageService
from app.models.user import User, UserProgress


@pytest.fixture
def storage():
    """Create in-memory user storage service for each test."""
    # Use in-memory DuckDB for test isolation
    service = UserStorageService(db_path=None)
    yield service
    service.close()


class TestUserStorageService:
    """Test user CRUD operations in DuckDB."""

    def test_create_user(self, storage):
        """Test creating a new user in DuckDB."""
        user = User(
            id="google_123",
            email="test@example.com",
            name="Test User",
            provider="google",
        )
        
        # Should successfully create user
        created_user = storage.create_user(user)
        
        assert created_user.id == "google_123"
        assert created_user.email == "test@example.com"
        assert created_user.name == "Test User"

    def test_get_existing_user(self, storage):
        """Test retrieving an existing user by ID."""
        # Create user
        user = User(
            id="google_456",
            email="existing@example.com",
            name="Existing User",
            provider="google",
        )
        storage.create_user(user)
        
        # Retrieve user
        retrieved_user = storage.get_user("google_456")
        
        assert retrieved_user is not None
        assert retrieved_user.id == "google_456"
        assert retrieved_user.email == "existing@example.com"

    def test_get_nonexistent_user(self, storage):
        """Test retrieving a user that doesn't exist returns None."""
        user = storage.get_user("nonexistent_user_id")
        assert user is None

    def test_get_user_by_email(self, storage):
        """Test retrieving user by email address."""
        user = User(
            id="google_789",
            email="findme@example.com",
            name="Find Me",
            provider="google",
        )
        storage.create_user(user)
        
        retrieved_user = storage.get_user_by_email("findme@example.com")
        
        assert retrieved_user is not None
        assert retrieved_user.id == "google_789"

    def test_duplicate_user_id_fails(self, storage):
        """Test that creating duplicate user ID raises error."""
        user1 = User(
            id="google_duplicate",
            email="user1@example.com",
            name="User 1",
            provider="google",
        )
        storage.create_user(user1)
        
        # Attempting to create another user with same ID should fail
        user2 = User(
            id="google_duplicate",  # Same ID
            email="user2@example.com",
            name="User 2",
            provider="google",
        )
        
        with pytest.raises(Exception):  # DuckDB will raise constraint violation
            storage.create_user(user2)


class TestUserProgressStorage:
    """Test progress tracking storage operations."""

    def test_create_initial_progress(self, storage):
        """Test creating initial progress for a new user."""
        # First create the user
        user = User(
            id="google_progress_1",
            email="progress@example.com",
            name="Progress User",
            provider="google",
        )
        storage.create_user(user)
        
        # Create progress
        progress = UserProgress(user_id="google_progress_1")
        created_progress = storage.create_progress(progress)
        
        assert created_progress.user_id == "google_progress_1"
        assert created_progress.completed_tutorials == []
        assert created_progress.unlocked_groups == [1]  # Default unlocked

    def test_get_user_progress(self, storage):
        """Test retrieving user progress."""
        # Setup
        user = User(
            id="google_progress_2",
            email="progress2@example.com",
            name="Progress User 2",
            provider="google",
        )
        storage.create_user(user)
        
        initial_progress = UserProgress(
            user_id="google_progress_2",
            completed_tutorials=["lazy-eval", "shuffle-cost"],
            seen_terms=["executor", "shuffle"],
        )
        storage.create_progress(initial_progress)
        
        # Retrieve
        retrieved_progress = storage.get_progress("google_progress_2")
        
        assert retrieved_progress is not None
        assert retrieved_progress.user_id == "google_progress_2"
        assert len(retrieved_progress.completed_tutorials) == 2
        assert "shuffle-cost" in retrieved_progress.completed_tutorials

    def test_update_progress_tutorials(self, storage):
        """Test updating completed tutorials list."""
        # Setup
        user = User(
            id="google_progress_3",
            email="progress3@example.com",
            name="Progress User 3",
            provider="google",
        )
        storage.create_user(user)
        
        progress = UserProgress(user_id="google_progress_3")
        storage.create_progress(progress)
        
        # Update
        progress.completed_tutorials = ["lazy-eval", "shuffle-cost", "partition-basics"]
        updated_progress = storage.update_progress(progress)
        
        assert len(updated_progress.completed_tutorials) == 3
        
        # Verify persistence
        retrieved = storage.get_progress("google_progress_3")
        assert len(retrieved.completed_tutorials) == 3

    def test_update_progress_unlocked_groups(self, storage):
        """Test unlocking new tutorial groups."""
        # Setup
        user = User(
            id="google_progress_4",
            email="progress4@example.com",
            name="Progress User 4",
            provider="google",
        )
        storage.create_user(user)
        
        progress = UserProgress(
            user_id="google_progress_4",
            unlocked_groups=[1],  # Only group 1 unlocked
        )
        storage.create_progress(progress)
        
        # Unlock group 2
        progress.unlocked_groups = [1, 2]
        updated_progress = storage.update_progress(progress)
        
        assert updated_progress.unlocked_groups == [1, 2]

    def test_update_progress_seen_terms(self, storage):
        """Test adding seen terminology terms."""
        # Setup
        user = User(
            id="google_progress_5",
            email="progress5@example.com",
            name="Progress User 5",
            provider="google",
        )
        storage.create_user(user)
        
        progress = UserProgress(
            user_id="google_progress_5",
            seen_terms=[],
        )
        storage.create_progress(progress)
        
        # Add terms
        progress.seen_terms = ["executor", "driver", "shuffle", "partition"]
        updated_progress = storage.update_progress(progress)
        
        assert len(updated_progress.seen_terms) == 4
        assert "shuffle" in updated_progress.seen_terms

    def test_update_progress_myth_interactions(self, storage):
        """Test tracking myth interactions."""
        # Setup
        user = User(
            id="google_progress_6",
            email="progress6@example.com",
            name="Progress User 6",
            provider="google",
        )
        storage.create_user(user)
        
        progress = UserProgress(user_id="google_progress_6")
        storage.create_progress(progress)
        
        # Add myth interaction
        progress.myth_interactions = {
            "more-partitions-faster": {
                "viewed": True,
                "timestamp": "2026-02-06T12:00:00",
            }
        }
        updated_progress = storage.update_progress(progress)
        
        assert "more-partitions-faster" in updated_progress.myth_interactions

    def test_progress_last_active_updates(self, storage):
        """Test that last_active timestamp updates on progress update."""
        # Setup
        user = User(
            id="google_progress_7",
            email="progress7@example.com",
            name="Progress User 7",
            provider="google",
        )
        storage.create_user(user)
        
        progress = UserProgress(user_id="google_progress_7")
        created = storage.create_progress(progress)
        original_time = created.last_active
        
        # Update progress
        progress.completed_tutorials = ["new-tutorial"]
        updated = storage.update_progress(progress)
        
        # last_active should be updated
        assert updated.last_active >= original_time

    def test_get_progress_for_nonexistent_user(self, storage):
        """Test getting progress for user with no progress returns None."""
        progress = storage.get_progress("nonexistent_user")
        assert progress is None
