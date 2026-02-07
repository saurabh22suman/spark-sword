"""Tests for Learning Path Unlocking Logic.

Following TDD Red-Green-Refactor-Verify:
- Tests define progressive group unlocking behavior (80% completion rule)
- Tests validate learning path state calculation
- Tests ensure group dependencies work correctly
- No Spark execution - this is educational progress tracking
"""

import pytest

from app.api.tutorials import TUTORIAL_GROUPS, get_learning_path_status, calculate_group_progress


class TestLearningPathUnlocking:
    """Test progressive unlocking of tutorial groups."""

    def test_group_1_always_unlocked(self):
        """Test that Group 1 (Spark Mental Model) is always unlocked for everyone."""
        completed_tutorials = []  # Brand new user
        
        status = get_learning_path_status(completed_tutorials)
        
        # Group 1 should always be unlocked
        assert status[0]["unlocked"] is True
        assert status[0]["number"] == 1

    def test_group_2_locked_with_zero_progress(self):
        """Test that Group 2 is locked when Group 1 has no progress."""
        completed_tutorials = []
        
        status = get_learning_path_status(completed_tutorials)
        
        # Group 2 should be locked
        group_2 = next(g for g in status if g["number"] == 2)
        assert group_2["unlocked"] is False

    def test_group_unlocks_at_80_percent_completion(self):
        """Test that next group unlocks when current group reaches 80% completion."""
        # Get all tutorial IDs from group 1
        group_1 = TUTORIAL_GROUPS[0]
        all_tutorials_in_group_1 = []
        for topic in group_1.tutorial_topics:
            for tutorial in topic.tutorials:
                all_tutorials_in_group_1.append(tutorial.id)
        
        # Complete 80% of tutorials (round up)
        total = len(all_tutorials_in_group_1)
        required = int(total * 0.8)
        if required * 1.0 / total < 0.8:
            required += 1
        
        completed_tutorials = all_tutorials_in_group_1[:required]
        
        status = get_learning_path_status(completed_tutorials)
        
        # Group 2 should now be unlocked
        group_2 = next(g for g in status if g["number"] == 2)
        assert group_2["unlocked"] is True

    def test_group_stays_locked_below_80_percent(self):
        """Test that next group stays locked when current group is below 80%."""
        # Get tutorials from group 1
        group_1 = TUTORIAL_GROUPS[0]
        all_tutorials_in_group_1 = []
        for topic in group_1.tutorial_topics:
            for tutorial in topic.tutorials:
                all_tutorials_in_group_1.append(tutorial.id)
        
        # Complete only 50% of tutorials
        total = len(all_tutorials_in_group_1)
        half = total // 2
        completed_tutorials = all_tutorials_in_group_1[:half]
        
        status = get_learning_path_status(completed_tutorials)
        
        # Group 2 should still be locked
        group_2 = next(g for g in status if g["number"] == 2)
        assert group_2["unlocked"] is False

    def test_group_completion_percentage_accurate(self):
        """Test that completion percentage is calculated correctly."""
        # Complete all tutorials from group 1 (2 tutorials)
        group_1 = TUTORIAL_GROUPS[0]
        all_tutorials = []
        for topic in group_1.tutorial_topics:
            for tutorial in topic.tutorials:
                all_tutorials.append(tutorial.id)
        
        completed_tutorials = all_tutorials[:2]  # Group 1 has 2 tutorials
        
        progress = calculate_group_progress(1, completed_tutorials)
        
        assert progress["completed_count"] == 2
        assert progress["total_count"] == len(all_tutorials)
        expected_percentage = (2 / len(all_tutorials)) * 100
        assert abs(progress["percentage"] - expected_percentage) < 0.01

    def test_all_groups_locked_except_first(self):
        """Test that brand new user sees only Group 1 unlocked."""
        completed_tutorials = []
        
        status = get_learning_path_status(completed_tutorials)
        
        unlocked_groups = [g for g in status if g["unlocked"]]
        assert len(unlocked_groups) == 1
        assert unlocked_groups[0]["number"] == 1

    def test_sequential_unlocking(self):
        """Test that groups unlock sequentially (can't skip groups)."""
        # Complete ALL of group 1 and ALL of group 2
        completed_tutorials = []
        
        for group_num in [0, 1]:  # Groups 1 and 2
            group = TUTORIAL_GROUPS[group_num]
            for topic in group.tutorial_topics:
                for tutorial in topic.tutorials:
                    completed_tutorials.append(tutorial.id)
        
        status = get_learning_path_status(completed_tutorials)
        
        # Groups 1, 2, and 3 should be unlocked
        group_1 = next(g for g in status if g["number"] == 1)
        group_2 = next(g for g in status if g["number"] == 2)
        group_3 = next(g for g in status if g["number"] == 3)
        group_4 = next(g for g in status if g["number"] == 4)
        
        assert group_1["unlocked"] is True
        assert group_2["unlocked"] is True
        assert group_3["unlocked"] is True
        assert group_4["unlocked"] is False  # Not enough progress in group 3

    def test_completion_state_accurate(self):
        """Test that groups show correct completion state."""
        # Complete ALL tutorials in group 1
        group_1 = TUTORIAL_GROUPS[0]
        completed_tutorials = []
        for topic in group_1.tutorial_topics:
            for tutorial in topic.tutorials:
                completed_tutorials.append(tutorial.id)
        
        status = get_learning_path_status(completed_tutorials)
        
        group_1_status = next(g for g in status if g["number"] == 1)
        assert group_1_status["completed"] is True
        assert group_1_status["progress_percentage"] == 100

    def test_partial_completion_state(self):
        """Test that partially completed groups show correct state."""
        # Complete half of group 1
        group_1 = TUTORIAL_GROUPS[0]
        all_tutorials = []
        for topic in group_1.tutorial_topics:
            for tutorial in topic.tutorials:
                all_tutorials.append(tutorial.id)
        
        half = len(all_tutorials) // 2
        completed_tutorials = all_tutorials[:half]
        
        status = get_learning_path_status(completed_tutorials)
        
        group_1_status = next(g for g in status if g["number"] == 1)
        assert group_1_status["completed"] is False
        assert 0 < group_1_status["progress_percentage"] < 100

    def test_learning_path_includes_all_15_groups(self):
        """Test that learning path returns all 15 tutorial groups (10 core + 5 expert)."""
        completed_tutorials = []
        
        status = get_learning_path_status(completed_tutorials)
        
        assert len(status) == 15
        # Verify sequential numbering
        for i, group in enumerate(status, 1):
            assert group["number"] == i

    def test_unlocked_groups_list_accurate(self):
        """Test that unlocked_groups list in UserProgress is accurate."""
        # Complete 80% of group 1
        group_1 = TUTORIAL_GROUPS[0]
        all_tutorials = []
        for topic in group_1.tutorial_topics:
            for tutorial in topic.tutorials:
                all_tutorials.append(tutorial.id)
        
        required = int(len(all_tutorials) * 0.8) + 1
        completed_tutorials = all_tutorials[:required]
        
        status = get_learning_path_status(completed_tutorials)
        unlocked_numbers = [g["number"] for g in status if g["unlocked"]]
        
        assert unlocked_numbers == [1, 2]

    def test_group_metadata_included_in_status(self):
        """Test that each group status includes necessary metadata."""
        completed_tutorials = []
        
        status = get_learning_path_status(completed_tutorials)
        
        first_group = status[0]
        
        # Should include all necessary fields
        assert "id" in first_group
        assert "number" in first_group
        assert "title" in first_group
        assert "subtitle" in first_group
        assert "icon" in first_group
        assert "color" in first_group
        assert "unlocked" in first_group
        assert "completed" in first_group
        assert "progress_percentage" in first_group
        assert "total_tutorials" in first_group
        assert "completed_tutorials" in first_group

    def test_zero_tutorials_means_zero_percent(self):
        """Test that empty completion list shows 0% for all groups."""
        completed_tutorials = []
        
        status = get_learning_path_status(completed_tutorials)
        
        for group in status:
            assert group["progress_percentage"] == 0.0

    def test_invalid_tutorial_ids_ignored(self):
        """Test that invalid/unknown tutorial IDs don't break the calculation."""
        completed_tutorials = [
            "fake-tutorial-1",
            "nonexistent-tutorial",
            "invalid-id"
        ]
        
        status = get_learning_path_status(completed_tutorials)
        
        # Should still return valid status for all groups (updated to 15 after adding expert groups)
        assert len(status) == 15
        # All should show 0% since none are valid
        for group in status:
            assert group["progress_percentage"] == 0.0
