import type { ColorState, RandomAction } from '../models/colorModel'
import type { RandomizationStrategy, StrategyMetadata } from './types'
import {
  getUniqueRandomColor,
  getColorSuccessCounts,
  type ChromotonCell,
} from '../utils/colorUtils'

export const metadata: StrategyMetadata = {
  id: 'swap-agitation',
  name: 'Chaotic',
  description:
    'High-energy chaos - swaps most successful color every 2 seconds',
}

const SWAP_INTERVAL_MS = 1500 // 1.5 seconds

/**
 * Swap Agitation Strategy
 *
 * High-energy strategy that swaps the MOST SUCCESSFUL color
 * every 2 seconds for maximum visual chaos and agitation.
 *
 * This strategy is useful for:
 * - Creating frenetic, high-energy visual experiences
 * - Constantly disrupting the dominant color
 * - Preventing any single color from stabilizing
 * - Pure visual chaos with population feedback
 *
 * Algorithm:
 * 1. Every 2 seconds, analyze the population
 * 2. Find the most successful color (highest cell count)
 * 3. Replace it with a new random color
 * 4. This constantly disrupts the "winning" color
 */
export class SwapAgitationStrategy implements RandomizationStrategy {
  private intervalId: NodeJS.Timeout | null = null

  start(
    getState: () => ColorState,
    getPopulation: () => {
      population: ChromotonCell[][]
      xDim: number
      yDim: number
    },
    applyAction: (action: RandomAction) => void
  ): void {
    // Start swapping every 2 seconds
    // Note: Don't swap immediately to avoid restart loops from colorState changes
    this.intervalId = setInterval(() => {
      this.swapMostSuccessfulColor(getState, getPopulation, applyAction)
    }, SWAP_INTERVAL_MS)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private swapMostSuccessfulColor(
    getState: () => ColorState,
    getPopulation: () => {
      population: ChromotonCell[][]
      xDim: number
      yDim: number
    },
    applyAction: (action: RandomAction) => void
  ): void {
    const state = getState()
    const { population, xDim, yDim } = getPopulation()

    // Analyze population to find most successful color
    const counts = getColorSuccessCounts(population, state.colors, xDim, yDim)
    const mostSuccessfulIndex = this.findMaxIndex(counts)

    // Get a new unique color
    const newColor = getUniqueRandomColor(state.currentPalette, state.colors)

    // Swap the most successful color
    applyAction({
      action: 'change',
      targetIndex: mostSuccessfulIndex,
      newColor,
    })
  }

  private findMaxIndex(counts: number[]): number {
    if (counts.length === 0) {
      return 0
    }

    let maxCount = -1
    let maxIndex = 0

    for (let i = 0; i < counts.length; i++) {
      if (counts[i] > maxCount) {
        maxCount = counts[i]
        maxIndex = i
      }
    }

    return maxIndex
  }
}
