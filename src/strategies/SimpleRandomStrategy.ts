import type { ColorState, RandomAction } from '../models/colorModel';
import type { RandomizationStrategy } from './types';
import { getUniqueRandomColor } from '../utils/colorUtils';

const MIN_COLORS = 1;
const MAX_COLORS = 5;

/**
 * Simple Random Strategy
 *
 * A simpler alternative to PopulationBasedStrategy that doesn't analyze
 * the simulation population. Instead, it just picks random actions and
 * random colors/indices.
 *
 * This strategy is useful for:
 * - Testing/comparison against the population-based approach
 * - Creating more chaotic, unpredictable color changes
 * - Debugging purposes
 *
 * Algorithm:
 * 1. Pick a random valid action (add/remove/change)
 * 2. Pick a random color index (for remove/change)
 * 3. Pick a random new color (for add/change)
 */
export class SimpleRandomStrategy implements RandomizationStrategy {
  determineAction(
    state: ColorState,
    _population: Uint8ClampedArray[][],
    _xDim: number,
    _yDim: number
  ): RandomAction | null {
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
