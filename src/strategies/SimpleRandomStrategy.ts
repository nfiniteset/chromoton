import type { ColorState, RandomAction } from '../models/colorModel'
import type { RandomizationStrategy, StrategyMetadata } from './types'
import { getUniqueRandomColor, type ChromotonCell } from '../utils/colorUtils'

export const metadata: StrategyMetadata = {
  id: 'simple',
  name: 'Classic',
  description: 'Randomly changes existing colors',
}

const MIN_CHANGE_TIME_MS = 8000 // 8 seconds
const MAX_CHANGE_TIME_MS = 15000 // 15 seconds

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
 * 1. Pick a random color index
 * 2. Replace it with a random new color
 */
export class SimpleRandomStrategy implements RandomizationStrategy {
  private timeoutId: NodeJS.Timeout | null = null

  start(
    getState: () => ColorState,
    getPopulation: () => {
      population: ChromotonCell[][]
      xDim: number
      yDim: number
    },
    applyAction: (action: RandomAction) => void
  ): void {
    this.scheduleNextChange(getState, getPopulation, applyAction)
  }

  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  private scheduleNextChange(
    getState: () => ColorState,
    getPopulation: () => {
      population: ChromotonCell[][]
      xDim: number
      yDim: number
    },
    applyAction: (action: RandomAction) => void
  ): void {
    const delay =
      MIN_CHANGE_TIME_MS +
      Math.random() * (MAX_CHANGE_TIME_MS - MIN_CHANGE_TIME_MS)

    this.timeoutId = setTimeout(() => {
      const state = getState()
      const action = this.determineAction(state)

      if (action) {
        applyAction(action)
      }

      // Schedule next change
      this.scheduleNextChange(getState, getPopulation, applyAction)
    }, delay)
  }

  private determineAction(state: ColorState): RandomAction | null {
    // Pick a random color to change (not based on success)
    const randomIndex = Math.floor(Math.random() * state.colors.length)
    const newColor = getUniqueRandomColor(state.currentPalette, state.colors)
    return { action: 'change', targetIndex: randomIndex, newColor }
  }
}
