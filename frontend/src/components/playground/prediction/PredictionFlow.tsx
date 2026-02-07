'use client';

/**
 * Prediction Flow Component
 * 
 * Per playground-predicition-animation-flow-spec.md:
 * Orchestrates the complete prediction → animation → explanation loop.
 * 
 * Flow:
 * 1. Change Input → 2. Predict → 3. Animate Spark Reaction → 4. Explain → 5. Allow Experiment
 * 
 * This loop must be:
 * - Fast
 * - Interruptible
 * - Repeatable
 */

import { useState, useCallback, useEffect } from 'react';
import { PredictionPrompt, PredictionType, PredictionOption } from './PredictionPrompt';
import { SparkReactionAnimation, SparkReactionType } from './SparkReactionAnimation';
import { PredictionExplanation, ExplanationContent, EXPLANATIONS } from './PredictionExplanation';

export type PredictionFlowState = 
  | 'idle'           // No prediction needed
  | 'prompting'      // Showing prediction prompt
  | 'locked'         // Prediction committed, about to animate
  | 'animating'      // Showing Spark reaction
  | 'explaining'     // Showing explanation
  | 'complete';      // User can experiment again

export interface PredictionTrigger {
  question: string;
  options: PredictionOption[];
  expectedOutcome: SparkReactionType;
  customExplanation?: ExplanationContent;
}

export interface PredictionFlowProps {
  /** Whether prediction should be triggered */
  shouldTrigger: boolean;
  /** Prediction configuration */
  trigger: PredictionTrigger | null;
  /** Callback when prediction flow completes */
  onComplete?: () => void;
  /** Callback when user resets to experiment */
  onReset?: () => void;
  /** Optional class name */
  className?: string;
}

export function PredictionFlow({
  shouldTrigger,
  trigger,
  onComplete,
  onReset,
  className = '',
}: PredictionFlowProps) {
  const [flowState, setFlowState] = useState<PredictionFlowState>('idle');
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionType | null>(null);
  const [actualOutcome, setActualOutcome] = useState<SparkReactionType>('idle');

  // Trigger prediction when conditions are met
  useEffect(() => {
    if (shouldTrigger && trigger && flowState === 'idle') {
      setFlowState('prompting');
      setSelectedPrediction(null);
      setActualOutcome('idle');
    }
  }, [shouldTrigger, trigger, flowState]);

  // Handle prediction selection
  const handleSelect = useCallback((prediction: PredictionType) => {
    setSelectedPrediction(prediction);
  }, []);

  // Handle prediction commitment (lock-in)
  const handleCommit = useCallback(() => {
    if (!selectedPrediction || !trigger) return;
    
    setFlowState('locked');
    
    // Brief lock-in pause for cognitive commitment
    setTimeout(() => {
      setActualOutcome(trigger.expectedOutcome);
      setFlowState('animating');
    }, 300);
  }, [selectedPrediction, trigger]);

  // Handle animation complete
  const handleAnimationComplete = useCallback(() => {
    setFlowState('explaining');
    onComplete?.();
  }, [onComplete]);

  // Handle reset to experiment again
  const handleReset = useCallback(() => {
    setFlowState('idle');
    setSelectedPrediction(null);
    setActualOutcome('idle');
    onReset?.();
  }, [onReset]);

  // Get explanation content
  const explanation = trigger?.customExplanation || EXPLANATIONS[actualOutcome];

  return (
    <div 
      data-testid="prediction-flow"
      data-flow-state={flowState}
      className={`space-y-4 ${className}`}
    >
      {/* Prediction Prompt */}
      {trigger && (flowState === 'prompting' || flowState === 'locked') && (
        <PredictionPrompt
          question={trigger.question}
          options={trigger.options}
          selectedPrediction={selectedPrediction}
          onSelect={handleSelect}
          onCommit={handleCommit}
          isLocked={flowState === 'locked'}
          isVisible={true}
        />
      )}

      {/* Spark Reaction Animation */}
      {(flowState === 'animating' || flowState === 'explaining') && (
        <SparkReactionAnimation
          reactionType={actualOutcome}
          isPlaying={flowState === 'animating'}
          onComplete={handleAnimationComplete}
        />
      )}

      {/* Explanation Panel */}
      {flowState === 'explaining' && explanation && (
        <PredictionExplanation
          userPrediction={selectedPrediction}
          actualOutcome={actualOutcome}
          explanation={explanation}
          isVisible={true}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

// Helper hook to determine when to trigger prediction
export function usePredictionTrigger(
  previousState: { shuffle: boolean; broadcast: boolean; skew: number },
  currentState: { shuffle: boolean; broadcast: boolean; skew: number }
): PredictionTrigger | null {
  // Narrow → Wide transformation
  if (!previousState.shuffle && currentState.shuffle) {
    return {
      question: "What do you think Spark will do with this transformation?",
      options: [
        { id: 'no_shuffle', label: 'No Shuffle', hint: 'Data stays local' },
        { id: 'shuffle', label: 'Shuffle', hint: 'Data moves between executors' },
        { id: 'broadcast_join', label: 'Broadcast Join', hint: 'Small table copied everywhere' },
      ],
      expectedOutcome: 'shuffle',
    };
  }

  // Shuffle → Broadcast join
  if (previousState.shuffle && currentState.broadcast) {
    return {
      question: "Will Spark shuffle or broadcast this join?",
      options: [
        { id: 'shuffle', label: 'Shuffle Both Tables', hint: 'Full data exchange' },
        { id: 'broadcast_join', label: 'Broadcast Small Table', hint: 'Copy small side' },
      ],
      expectedOutcome: 'broadcast',
    };
  }

  // Balanced → Skewed
  if (previousState.skew <= 1.5 && currentState.skew > 3) {
    return {
      question: "How will Spark handle these uneven partitions?",
      options: [
        { id: 'balanced' as PredictionType, label: 'Evenly Distributed', hint: 'All tasks similar' },
        { id: 'skewed' as PredictionType, label: 'Skewed', hint: 'One task takes longer' },
      ],
      expectedOutcome: 'skew',
    };
  }

  return null;
}

export default PredictionFlow;
