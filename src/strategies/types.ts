import type { ColorState, RandomAction } from '../models/colorModel'
import type { ChromotonCell } from '../utils/colorUtils'

/**
 * Strategy metadata for UI display and registration
 */
export interface StrategyMetadata {
  id: string
  name: string
  description: string
}

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
    getPopulation: () => {
      population: ChromotonCell[][]
      xDim: number
      yDim: number
    },
    applyAction: (action: RandomAction) => void
  ): void

  /**
   * Stop the strategy and cleanup any timers/resources
   */
  stop(): void
}

/**
 * Strategy registry entry combining class and metadata
 */
export interface StrategyRegistryEntry {
  metadata: StrategyMetadata
  Strategy: new () => RandomizationStrategy
}
