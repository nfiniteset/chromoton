import type { ColorState, RandomAction } from '../models/colorModel';

/**
 * Strategy interface for active randomization
 *
 * Strategies manage their own timing and trigger actions when they decide to.
 * This inverts control - strategies are active, not passively polled.
 */
export interface RandomizationStrategy {
  /**
   * Start the strategy's autonomous operation
   *
   * @param getState - Function to get current color state
   * @param getPopulation - Function to get current simulation population
   * @param applyAction - Callback to apply a random action
   */
  start(
    getState: () => ColorState,
    getPopulation: () => { population: Uint8ClampedArray[][]; xDim: number; yDim: number },
    applyAction: (action: RandomAction) => void
  ): void;

  /**
   * Stop the strategy and cleanup any timers/resources
   */
  stop(): void;
}
