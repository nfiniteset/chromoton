import type { ColorState, RandomAction } from '../models/colorModel';
import type { RandomizationStrategy } from './types';

/**
 * No-Op Strategy
 *
 * A strategy that performs no automatic randomization.
 * Always returns null, meaning no automatic color changes will occur.
 *
 * This allows users to manually control all color changes through the UI
 * (add, remove, change colors) without any automatic randomization.
 *
 * Use this when you want complete manual control over the color palette.
 */
export class NoOpStrategy implements RandomizationStrategy {
  determineAction(
    _state: ColorState,
    _population: Uint8ClampedArray[][],
    _xDim: number,
    _yDim: number
  ): RandomAction | null {
    // Never perform any automatic actions
    return null;
  }
}
