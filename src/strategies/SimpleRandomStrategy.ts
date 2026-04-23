import type { ColorState, RandomAction } from '../models/colorModel';
import type { RandomizationStrategy } from './types';
import { getUniqueRandomColor } from '../utils/colorUtils';

const MIN_COLORS = 1;
const MAX_COLORS = 5;
const MIN_CHANGE_TIME_MS = 8000; // 8 seconds
const MAX_CHANGE_TIME_MS = 15000; // 15 seconds

/**
 * Simple Random Strategy
 *
 * Makes random color changes at random intervals (8-15 seconds).
 * Doesn't analyze the simulation population - just pure chaos!
 *
 * This strategy is useful for:
 * - Creating chaotic, unpredictable color changes
 * - Testing/comparison against smarter strategies
 * - Fun visual experimentation
 *
 * Algorithm:
 * 1. Pick a random valid action (add/remove/change)
 * 2. Pick a random color index (for remove/change)
 * 3. Pick a random new color (for add/change)
 */
export class SimpleRandomStrategy implements RandomizationStrategy {
  private timeoutId: NodeJS.Timeout | null = null;

  start(
    getState: () => ColorState,
    getPopulation: () => { population: Uint8ClampedArray[][]; xDim: number; yDim: number },
    applyAction: (action: RandomAction) => void
  ): void {
    this.scheduleNextChange(getState, getPopulation, applyAction);
  }

  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private scheduleNextChange(
    getState: () => ColorState,
    getPopulation: () => { population: Uint8ClampedArray[][]; xDim: number; yDim: number },
    applyAction: (action: RandomAction) => void
  ): void {
    const delay = MIN_CHANGE_TIME_MS + Math.random() * (MAX_CHANGE_TIME_MS - MIN_CHANGE_TIME_MS);

    this.timeoutId = setTimeout(() => {
      const state = getState();
      const action = this.determineAction(state);

      if (action) {
        applyAction(action);
      }

      // Schedule next change
      this.scheduleNextChange(getState, getPopulation, applyAction);
    }, delay);
  }

  private determineAction(state: ColorState): RandomAction | null {
    // Intentionally ignore population data - just make random choices
    const availableActions = this.getAvailableActions(state.colors.length);
    const action = this.pickRandomAction(availableActions);

    return this.createActionResult(action, state);
  }

  private getAvailableActions(currentCount: number): Array<'add' | 'remove' | 'change'> {
    const availableActions: Array<'add' | 'remove' | 'change'> = [];

    if (currentCount > MIN_COLORS) {
      availableActions.push('remove');
    }
    if (currentCount < MAX_COLORS) {
      availableActions.push('add');
    }
    availableActions.push('change');

    return availableActions;
  }

  private pickRandomAction(availableActions: Array<'add' | 'remove' | 'change'>): 'add' | 'remove' | 'change' {
    if (availableActions.length === 0) {
      return 'change';
    }

    const actionIndex = Math.floor(Math.random() * availableActions.length);
    return availableActions[actionIndex];
  }

  private createActionResult(
    action: 'add' | 'remove' | 'change',
    state: ColorState
  ): RandomAction | null {
    if (action === 'remove') {
      // Pick a random color to remove (not based on success)
      const randomIndex = Math.floor(Math.random() * state.colors.length);
      return { action: 'remove', targetIndex: randomIndex };
    }

    if (action === 'add') {
      const newColor = getUniqueRandomColor(state.currentPalette, state.colors);
      return { action: 'add', newColor };
    }

    if (action === 'change') {
      // Pick a random color to change (not based on success)
      const randomIndex = Math.floor(Math.random() * state.colors.length);
      const newColor = getUniqueRandomColor(state.currentPalette, state.colors);
      return { action: 'change', targetIndex: randomIndex, newColor };
    }

    return null;
  }
}
