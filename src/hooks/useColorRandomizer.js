import { useEffect, useRef } from 'react';

const MIN_CHANGE_TIME = 8000;
const MAX_CHANGE_TIME = 15000;

/**
 * Hook to automatically randomize colors at intervals
 * @param {boolean} enabled - Whether randomization is enabled
 * @param {Function} determineRandomAction - Callback to determine what action to take
 * @param {Function} onApplyAction - Callback to apply the action
 */
export function useColorRandomizer(enabled, determineRandomAction, onApplyAction) {
  const timeoutRef = useRef(null);

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
