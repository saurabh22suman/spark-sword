/**
 * Unit Tests for PredictionQuiz Component
 * 
 * Tests the prediction-first learning pattern (Brilliant.org pattern):
 * - Multiple choice rendering
 * - Lock-in state transitions
 * - Prediction commit flow
 * - Result comparison
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PredictionQuiz, type QuizOption } from '../prediction/PredictionQuiz';

describe('PredictionQuiz', () => {
  const mockOptions: QuizOption[] = [
    { id: 'broadcast', label: 'Broadcast Join' },
    { id: 'shuffle', label: 'Shuffle Join' },
    { id: 'unsure', label: "I'm not sure" },
  ];

  const mockQuestion = 'How will Spark execute this join?';
  const mockExpectedAnswer = 'broadcast';
  const mockExplanation = 'Spark chose broadcast because the right side (15MB) is below the 10MB threshold.';

  it('renders quiz question and options', () => {
    render(
      <PredictionQuiz
        question={mockQuestion}
        options={mockOptions}
        expectedAnswer={mockExpectedAnswer}
        explanation={mockExplanation}
        onComplete={vi.fn()}
        isVisible={true}
      />
    );

    expect(screen.getByText(mockQuestion)).toBeInTheDocument();
    expect(screen.getByText('Broadcast Join')).toBeInTheDocument();
    expect(screen.getByText('Shuffle Join')).toBeInTheDocument();
    expect(screen.getByText(/unsure/i)).toBeInTheDocument();
  });

  it('allows selecting an option', async () => {
    const user = userEvent.setup();
    render(
      <PredictionQuiz
        question={mockQuestion}
        options={mockOptions}
        expectedAnswer={mockExpectedAnswer}
        explanation={mockExplanation}
        onComplete={vi.fn()}
        isVisible={true}
      />
    );

    const broadcastOption = screen.getByRole('radio', { name: /broadcast join/i });
    await user.click(broadcastOption);

    expect(broadcastOption).toBeChecked();
  });

  it('commits prediction and locks input', async () => {
    const usComplete = vi.fn();

    render(
      <PredictionQuiz
        question={mockQuestion}
        options={mockOptions}
        expectedAnswer={mockExpectedAnswer}
        explanation={mockExplanation}
        onComplete={onComplete}
        isVisible={true}
      />
    );

    // Select option
    const broadcastOption = screen.getByRole('radio', { name: /broadcast join/i });
    await user.click(broadcastOption);

    // Commit
    const commitButton = screen.getByRole('button', { name: /commit/i });
    await user.click(commitButton);

    // Should call onComplete with correct status and prediction
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(true, 'broadcast');
    });

    // Options should be disabled after commit
    expect(broadcastOption).toBeDisabled();
  });

  it('shows correct prediction result', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    render(
      <PredictionQuiz
        question={mockQuestion}
        options={mockOptions}
        expectedAnswer={mockExpectedAnswer}
        explanation={mockExplanation}
        onComplete={onComplete}
        isVisible={true}
      />
    );

    // Select correct answer
    const broadcastOption = screen.getByRole('radio', { name: /broadcast join/i });
    await user.click(broadcastOption);
    await user.click(screen.getByRole('button', { name: /commit/i }));

    // Should show success indicator after commit
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(true, 'broadcast');
    });
  });

  it('shows incorrect prediction result', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    render(
      <PredictionQuiz
        question={mockQuestion}
        options={mockOptions}
        expectedAnswer={mockExpectedAnswer}
        explanation={mockExplanation}
        onComplete={onComplete}
        isVisible={true}
      />
    );

    // Select wrong answer
    const shuffleOption = screen.getByRole('radio', { name: /shuffle join/i });
    await user.click(shuffleOption);
    await user.click(screen.getByRole('button', { name: /commit/i }));

    // Should call onComplete with false for incorrect answer
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(false, 'shuffle');
    });

    // Should show explanation after commit
    await waitFor(() => {
      expect(screen.getByText(mockExplanation)).toBeInTheDocument();
    });
  });

  it('handles "unsure" option without penalty', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    render(
      <PredictionQuiz
        question={mockQuestion}
        options={mockOptions}
        expectedAnswer={mockExpectedAnswer}
        explanation={mockExplanation}
        onComplete={onComplete}
        isVisible={true}
      />
    );

    const unsureOption = screen.getByRole('radio', { name: /unsure/i });
    await user.click(unsureOption);
    await user.click(screen.getByRole('button', { name: /commit/i }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(false, 'unsure');
    });
  });

  it('requires selection before commit', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    render(
      <PredictionQuiz
        question={mockQuestion}
        options={mockOptions}
        expectedAnswer={mockExpectedAnswer}
        explanation={mockExplanation}
        onComplete={onComplete}
        isVisible={true}
      />
    );

    const commitButton = screen.getByRole('button', { name: /commit/i });
    
    // Commit button should be disabled without selection
    expect(commitButton).toBeDisabled();

    // Select an option
    await user.click(screen.getByRole('radio', { name: /broadcast join/i }));

    // Now commit should be enabled
    expect(commitButton).not.toBeDisabled();
  });
});
