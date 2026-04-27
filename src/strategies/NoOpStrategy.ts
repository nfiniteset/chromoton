import type { ColorState, RandomAction } from '../models/colorModel'
import type { RandomizationStrategy, StrategyMetadata } from './types'
import type { ChromotonCell } from '../utils/colorUtils'

export const metadata: StrategyMetadata = {
  id: 'none',
  name: 'None',
  description: 'Manual control only, no auto-randomization',
}

/**
 * No-Op Strategy
 *
 * A strategy that performs no automatic randomization.
 * Does nothing when started, providing complete manual control.
 *
 * This allows users to manually control all color changes through the UI
 * (add, remove, change colors) without any automatic randomization.
 *
 * Use this when you want complete manual control over the color palette.
 */
export class NoOpStrategy implements RandomizationStrategy {
  start(
    _getState: () => ColorState,
    _getPopulation: () => {
      population: ChromotonCell[][]
      xDim: number
      yDim: number
    },
    _applyAction: (action: RandomAction) => void
  ): void {
    // Do nothing - this strategy is intentionally inactive
  }

  stop(): void {
    // Nothing to clean up
  }
}
