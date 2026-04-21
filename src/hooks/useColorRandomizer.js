import { useEffect, useRef } from 'react';
import { determineColorChangeAction } from '../utils/colorUtils';

const MIN_CHANGE_TIME = 8000;
const MAX_CHANGE_TIME = 15000;

/**
 * Hook to automatically randomize colors at intervals
 * @param {boolean} enabled - Whether randomization is enabled
 * @param {string} paletteName - Current palette name
 * @param {Array} targetColors - Current target colors
 * @param {Function} onColorChange - Callback when colors should change
 */
export function useColorRandomizer(enabled, paletteName, targetColors, onColorChange) {
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
          const action = determineColorChangeAction(paletteName, targetColors, population, xDim, yDim);

          if (onColorChange) {
            onColorChange(action);
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
  }, [enabled, paletteName, targetColors, onColorChange]);
}
