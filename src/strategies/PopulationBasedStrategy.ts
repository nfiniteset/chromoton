import type { Color, ColorState, RandomAction } from '../models/colorModel';
import type { RandomizationStrategy } from './types';
import { PALETTES } from '../palettes';
import { getRandomColor, getUniqueRandomColor, getColorSuccessCounts } from '../utils/colorUtils';

const MIN_COLORS = 1;
const MAX_COLORS = 5;

/**
 * Population-Based Randomization Strategy
 *
 * This strategy analyzes the simulation population to determine which colors
 * are most successful, then makes intelligent decisions about adding, removing,
 * or changing colors based on that analysis.
 *
 * Algorithm:
 * 1. Count how many cells are closest to each target color
 * 2. Identify the most successful color
 * 3. Pick a random action (add/remove/change) based on constraints
 * 4. For remove: target the most successful color
 * 5. For add/change: pick colors not currently in use
 */
export class PopulationBasedStrategy implements RandomizationStrategy {
  determineAction(
    state: ColorState,
    population: Uint8ClampedArray[][],
    xDim: number,
    yDim: number
  ): RandomAction | null {
    const counts = getColorSuccessCounts(population, state.colors, xDim, yDim);
    const mostSuccessfulIndex = this.findMaxIndex(counts);

    const availableActions = this.getAvailableActions(state.colors.length);
    const action = this.pickRandomAction(availableActions);

    return this.createActionResult(action, state, mostSuccessfulIndex);
  }

  private findMaxIndex(counts: number[]): number {
    if (counts.length === 0) {
      return 0;
    }

    let maxCount = -1;
    let maxIndex = 0;

    for (let i = 0; i < counts.length; i++) {
      if (counts[i] > maxCount) {
        maxCount = counts[i];
        maxIndex = i;
      }
    }

    return maxIndex;
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
    state: ColorState,
    mostSuccessfulIndex: number
  ): RandomAction | null {
    if (action === 'remove') {
      return { action: 'remove', targetIndex: mostSuccessfulIndex };
    }

    if (action === 'add') {
      const newColor = getUniqueRandomColor(state.currentPalette, state.colors);
      return { action: 'add', newColor };
    }

    if (action === 'change') {
      const newColor = this.getColorForChange(state, mostSuccessfulIndex);
      return { action: 'change', targetIndex: mostSuccessfulIndex, newColor };
    }

    return null;
  }

  private getColorForChange(state: ColorState, excludeIndex: number): Color {
    const palette = PALETTES[state.currentPalette];
    const isCustomMode = palette === null;

    if (isCustomMode) {
      return getRandomColor(state.currentPalette);
    }

    const availableColors = this.findAvailableColorsExcluding(state, excludeIndex);
    const hasAvailableColors = availableColors.length > 0;

    return hasAvailableColors
      ? this.selectRandomFromArray(availableColors)!
      : getRandomColor(state.currentPalette);
  }

  private findAvailableColorsExcluding(state: ColorState, excludeIndex: number): Color[] {
    const palette = PALETTES[state.currentPalette];
    if (!palette) {
      return [];
    }

    const availableColors: Color[] = [];

    for (const paletteColor of palette) {
      const isInUse = this.isColorInTargetsExcluding(paletteColor, state.colors, excludeIndex);

      if (!isInUse) {
        availableColors.push(paletteColor);
      }
    }

    return availableColors;
  }

  private isColorInTargetsExcluding(paletteColor: Color, targetColors: Color[], excludeIndex: number): boolean {
    for (let j = 0; j < targetColors.length; j++) {
      if (j === excludeIndex) {
        continue;
      }

      const target = targetColors[j];
      if (
        target.r === paletteColor.r &&
        target.g === paletteColor.g &&
        target.b === paletteColor.b
      ) {
        return true;
      }
    }

    return false;
  }

  private selectRandomFromArray(colors: Color[]): Color | null {
    if (colors.length === 0) {
      return null;
    }

    const index = Math.floor(Math.random() * colors.length);
    const selectedColor = colors[index];
    return {
      r: selectedColor.r,
      g: selectedColor.g,
      b: selectedColor.b
    };
  }
}
