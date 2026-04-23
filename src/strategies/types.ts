import type { ColorState, RandomAction } from '../models/colorModel';

/**
 * Strategy interface for determining randomization actions
 *
 * Implementations of this interface define HOW to choose random actions
 * (add/remove/change colors) based on the current state and simulation data.
 */
export interface RandomizationStrategy {
  /**
   * Determine what random action to take based on current state and population
   *
   * @param state - Current color model state
   * @param population - Current simulation population grid
   * @param xDim - Width of the simulation grid
   * @param yDim - Height of the simulation grid
   * @returns A random action to apply, or null if no action should be taken
   */
  determineAction(
    state: ColorState,
    population: Uint8ClampedArray[][],
    xDim: number,
    yDim: number
  ): RandomAction | null;
}
