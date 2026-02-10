/**
 * Unit Tests for SelectivityScrubber
 * 
 * Tests the continuous selectivity adjustment interface:
 * - Slider interaction
 * - Preset values (1%, 10%, 25%, 50%, 75%, 90%)
 * - Real-time feedback
 * - Value validation
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectivityScrubber } from '../SelectivityScrubber';

describe('SelectivityScrubber', () => {
  it('renders with initial value', () => {
    render(
      <SelectivityScrubber
        value={0.5}
        onChange={vi.fn()}
        label="Filter Selectivity"
      />
    );

    expect(screen.getByText('Filter Selectivity')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument(); // 0.5 = 50%
  });

  it('calls onChange when slider is moved', async () => {
    const onChange = vi.fn();
    render(
      <SelectivityScrubber
        value={0.5}
        onChange={onChange}
        label="Filter Selectivity"
      />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });

    expect(onChange).toHaveBeenCalledWith(0.75);
  });

  it('renders preset buttons', () => {
    render(
      <SelectivityScrubber
        value={0.5}
        onChange={vi.fn()}
        label="Filter Selectivity"
      />
    );

    // Check for common preset values
    expect(screen.getByText('1%')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('applies preset value when button clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SelectivityScrubber
        value={0.5}
        onChange={onChange}
        label="Filter Selectivity"
      />
    );

    const preset25Button = screen.getByText('25%');
    await user.click(preset25Button);

    expect(onChange).toHaveBeenCalledWith(0.25);
  });

  it('shows current value as percentage', () => {
    const { rerender } = render(
      <SelectivityScrubber
        value={0.33}
        onChange={vi.fn()}
        label="Filter Selectivity"
      />
    );

    expect(screen.getByText(/33%/)).toBeInTheDocument();

    rerender(
      <SelectivityScrubber
        value={0.67}
        onChange={vi.fn()}
        label="Filter Selectivity"
      />
    );

    expect(screen.getByText(/67%/)).toBeInTheDocument();
  });

  it('highlights active preset', () => {
    const { container } = render(
      <SelectivityScrubber
        value={0.25}
        onChange={vi.fn()}
        label="Filter Selectivity"
      />
    );

    const preset25Button = screen.getByText('25%').closest('button');
    expect(preset25Button).toHaveClass('bg-blue-500'); // Active state
  });

  it('clamps values to 0-1 range', () => {
    const onChange = vi.fn();
    render(
      <SelectivityScrubber
        value={0.5}
        onChange={onChange}
        label="Filter Selectivity"
      />
    );

    const slider = screen.getByRole('slider');
    
    // Try to set above 100%
    fireEvent.change(slider, { target: { value: '150' } });
    expect(onChange).toHaveBeenCalledWith(1.0);

    // Try to set below 0%
    fireEvent.change(slider, { target: { value: '-10' } });
    expect(onChange).toHaveBeenCalledWith(0.0);
  });

  it('provides real-time visual feedback', () => {
    const { container } = render(
      <SelectivityScrubber
        value={0.5}
        onChange={vi.fn()}
        label="Filter Selectivity"
      />
    );

    const slider = container.querySelector('input[type="range"]');
    expect(slider).toHaveAttribute('value', '50');

    // Slider track should show visual progress
    const sliderThumb = slider?.closest('.relative');
    expect(sliderThumb).toBeTruthy();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SelectivityScrubber
        value={0.5}
        onChange={onChange}
        label="Filter Selectivity"
      />
    );

    const slider = screen.getByRole('slider');
    slider.focus();

    // Arrow right should increase value
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalled();

    // Arrow left should decrease value
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalled();
  });

  it('displays optional description', () => {
    const description = 'Percentage of rows that pass the filter';
    render(
      <SelectivityScrubber
        value={0.5}
        onChange={vi.fn()}
        label="Filter Selectivity"
        description={description}
      />
    );

    expect(screen.getByText(description)).toBeInTheDocument();
  });
});
