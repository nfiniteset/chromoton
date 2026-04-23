import { useEffect } from 'react';
import type { RandomAction, ColorState } from '../models/colorModel';
import type { RandomizationStrategy } from '../strategies';

// Declare chromoton global
declare global {
  interface Window {
    chromoton?: {
      getPopulation: () => {
        population: Uint8ClampedArray[][];
        xDim: number;
        yDim: number;
      };
    };
  }
}

/**
 * Hook to initialize and cleanup active randomization strategies
 *
 * Strategies manage their own timing and trigger actions autonomously.
 * This hook just starts/stops them based on enabled state and strategy changes.
 *
 * @param enabled - Whether randomization is enabled
 * @param strategy - The randomization strategy to use
 * @param colorState - Current color state (provided to strategy)
 * @param onApplyAction - Callback for strategy to apply actions
 */
export function useColorRandomizer(
  enabled: boolean,
  strategy: RandomizationStrategy,
  colorState: ColorState,
  onApplyAction: (action: RandomAction) => void
): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Create stable getter functions for strategy to call
    const getState = () => colorState;
    const getPopulation = () => {
      if (window.chromoton && window.chromoton.getPopulation) {
        return window.chromoton.getPopulation();
      }
      return { population: [], xDim: 0, yDim: 0 };
    };

    // Start the strategy - it will manage its own timing
    strategy.start(getState, getPopulation, onApplyAction);

    // Cleanup on unmount or strategy change
    return () => {
      strategy.stop();
    };
  }, [enabled, strategy, colorState, onApplyAction]);
}
