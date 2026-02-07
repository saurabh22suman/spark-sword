"""Tests for User and UserProgress models.

Following TDD Red-Green-Refactor-Verify:
- These tests define expected behavior BEFORE implementation
- Tests validate Pydantic model constraints and serialization
- No Spark behavior is involved - this is pure data validation
"""

import pytest
from datetime import datetime
from pydantic import ValidationError

from app.models.user import User, UserProgress


class TestUserModel:
    """Test User model validation and constraints."""

    def test_valid_user_creation(self):
        """Test creating a valid user with all required fields."""
        user = User(
            id="google_123456789",
            email="test@example.com",
            name="Test User",
            picture="https://example.com/avatar.jpg",
            provider="google",
        )
        assert user.id == "google_123456789"
        assert user.email == "test@example.com"
        assert user.name == "Test User"
        assert user.picture == "https://example.com/avatar.jpg"
        assert user.provider == "google"
        assert isinstance(user.created_at, datetime)

    def test_user_with_minimal_fields(self):
        """Test user creation with only required fields (picture optional)."""
        user = User(
            id="google_123",
            email="minimal@example.com",
            name="Minimal User",
            provider="google",
        )
        assert user.id == "google_123"
        assert user.picture is None

    def test_user_invalid_email_format(self):
        """Test that invalid email format raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            User(
                id="google_123",
                email="not-an-email",  # Invalid email format
                name="Test User",
                provider="google",
            )
        
        # Pydantic should complain about email format
        assert "email" in str(exc_info.value).lower()

    def test_user_missing_required_fields(self):
        """Test that missing required fields raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            User(
                id="google_123",
                # Missing email, name, provider
            )
        
        errors = exc_info.value.errors()
        missing_fields = {error["loc"][0] for error in errors}
        assert "email" in missing_fields
        assert "name" in missing_fields
        assert "provider" in missing_fields

    def test_user_serialization(self):
        """Test user can be serialized to dict for storage."""
        user = User(
            id="google_123",
            email="test@example.com",
            name="Test User",
            provider="google",
        )
        user_dict = user.model_dump()
        
        assert user_dict["id"] == "google_123"
        assert user_dict["email"] == "test@example.com"
        assert "created_at" in user_dict


class TestUserProgressModel:
    """Test UserProgress model for tracking learning state."""

    def test_valid_progress_creation(self):
        """Test creating progress record with default values."""
        progress = UserProgress(
            user_id="google_123",
        )
        
        assert progress.user_id == "google_123"
        assert progress.completed_tutorials == []
        assert progress.seen_terms == []
        assert progress.myth_interactions == {}
        assert isinstance(progress.last_active, datetime)

    def test_progress_with_completed_tutorials(self):
        """Test progress tracking completed tutorials."""
        progress = UserProgress(
            user_id="google_123",
            completed_tutorials=["lazy-eval", "shuffle-cost", "partition-basics"],
        )
        
        assert len(progress.completed_tutorials) == 3
        assert "shuffle-cost" in progress.completed_tutorials

    def test_progress_with_seen_terms(self):
        """Test progress tracking seen terminology."""
        progress = UserProgress(
            user_id="google_123",
            seen_terms=["executor", "shuffle", "partition", "driver"],
        )
        
        assert len(progress.seen_terms) == 4
        assert "shuffle" in progress.seen_terms

    def test_progress_with_myth_interactions(self):
        """Test progress tracking myth interactions (views, likes, etc)."""
        progress = UserProgress(
            user_id="google_123",
            myth_interactions={
                "more-partitions-faster": {"viewed": True, "timestamp": "2026-02-06T10:00:00"},
                "cache-everything": {"viewed": True, "dismissed": False},
            },
        )
        
        assert "more-partitions-faster" in progress.myth_interactions
        assert progress.myth_interactions["more-partitions-faster"]["viewed"] is True

    def test_progress_update_last_active(self):
        """Test that last_active can be updated."""
        progress = UserProgress(user_id="google_123")
        original_time = progress.last_active
        
        # Simulate update
        new_time = datetime.now()
        progress.last_active = new_time
        
        assert progress.last_active > original_time

    def test_progress_serialization_for_duckdb(self):
        """Test progress can be serialized for DuckDB storage."""
        progress = UserProgress(
            user_id="google_123",
            completed_tutorials=["tutorial-1", "tutorial-2"],
            seen_terms=["term-1", "term-2"],
            myth_interactions={"myth-1": {"viewed": True}},
        )
        
        progress_dict = progress.model_dump()
        
        assert progress_dict["user_id"] == "google_123"
        assert isinstance(progress_dict["completed_tutorials"], list)
        assert isinstance(progress_dict["seen_terms"], list)
        assert isinstance(progress_dict["myth_interactions"], dict)
        assert "last_active" in progress_dict

    def test_progress_missing_user_id(self):
        """Test that missing user_id raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            UserProgress()
        
        errors = exc_info.value.errors()
        assert any(error["loc"][0] == "user_id" for error in errors)

    def test_progress_tracks_unlocked_groups(self):
        """Test progress can track which tutorial groups are unlocked."""
        progress = UserProgress(
            user_id="google_123",
            unlocked_groups=[1, 2, 3],  # Groups 1-3 unlocked
        )
        
        assert progress.unlocked_groups == [1, 2, 3]
        assert len(progress.unlocked_groups) == 3
