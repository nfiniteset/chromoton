import { useEffect, useRef } from 'react';
import type { RandomAction } from '../models/colorModel';

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

const MIN_CHANGE_TIME = 8000;
const MAX_CHANGE_TIME = 15000;

/**
 * Hook to automatically randomize colors at intervals
 */
export function useColorRandomizer(
  enabled: boolean,
  determineRandomAction: (
    population: Uint8ClampedArray[][],
    xDim: number,
    yDim: number
  ) => RandomAction | null,
  onApplyAction: (action: RandomAction) => void
): void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const scheduleNextChange = () => {
      const delay = MIN_CHANGE_TIME + Math.random() * (MAX_CHANGE_TIME - MIN_CHANGE_TIME);

      timeoutRef.current = setTimeout(() => {
        // Get current population state from chromoton
        if (window.chromoton && window.chromoton.getPopulation) {
          const { population, xDim, yDim } = window.chromoton.getPopulation();
          const action = determineRandomAction(population, xDim, yDim);

          if (action && onApplyAction) {
            onApplyAction(action);
          }
        }

        // Schedule next change
        scheduleNextChange();
      }, delay);
    };

    scheduleNextChange();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, determineRandomAction, onApplyAction]);
}
