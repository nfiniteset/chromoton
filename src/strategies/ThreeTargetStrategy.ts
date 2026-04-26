import type { Color, ColorState, RandomAction } from '../models/colorModel'
import type { RandomizationStrategy, StrategyMetadata } from './types'
import { getColorSuccessCounts } from '../utils/colorUtils'
import { getUniqueRandomColor } from '../utils/colorUtils'

export const metadata: StrategyMetadata = {
  id: 'three-target',
  name: 'Dramatic',
  description:
    'Replaces any color reaching 40%+, or the most dominant after 8-15s of stasis',
}

const REPLACEMENT_THRESHOLD = 0.4 // 40%
const CHECK_INTERVAL_MS = 3000 // Check every 3 seconds
const MIN_FALLBACK_MS = 8000
const MAX_FALLBACK_MS = 15000

/**
 * Three-Target Strategy
 *
 * Two complementary timers:
 * - Every 2s: replaces any color at 40%+ of the population
 * - Every 8-15s: replaces the most dominant color unconditionally (stasis breaker)
 *
 * Any swap — from either timer — resets the 8-15s timer.
 */
export class ThreeTargetStrategy implements RandomizationStrategy {
  private intervalId: NodeJS.Timeout | null = null
  private fallbackTimeoutId: NodeJS.Timeout | null = null
  private getState: (() => ColorState) | null = null
  private getPopulation:
    | (() => {
        population: Uint8ClampedArray[][]
        xDim: number
        yDim: number
      })
    | null = null
  private applyAction: ((action: RandomAction) => void) | null = null

  start(
    getState: () => ColorState,
    getPopulation: () => {
      population: Uint8ClampedArray[][]
      xDim: number
      yDim: number
    },
    applyAction: (action: RandomAction) => void
  ): void {
    this.getState = getState
    this.getPopulation = getPopulation
    this.applyAction = applyAction

    // Check immediately on start
    this.checkAndAct()

    // 2s threshold checks
    this.intervalId = setInterval(() => {
      this.checkAndAct()
    }, CHECK_INTERVAL_MS)

    // Start the stasis-breaker timer
    this.scheduleFallback()
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (this.fallbackTimeoutId) {
      clearTimeout(this.fallbackTimeoutId)
      this.fallbackTimeoutId = null
    }
    this.getState = null
    this.getPopulation = null
    this.applyAction = null
  }

  private scheduleFallback(): void {
    if (this.fallbackTimeoutId) {
      clearTimeout(this.fallbackTimeoutId)
    }
    const delay =
      MIN_FALLBACK_MS + Math.random() * (MAX_FALLBACK_MS - MIN_FALLBACK_MS)
    this.fallbackTimeoutId = setTimeout(() => {
      this.swapMostDominant()
      this.scheduleFallback()
    }, delay)
  }

  private checkAndAct(): void {
    if (!this.getState || !this.getPopulation || !this.applyAction) return

    const state = this.getState()
    const { population, xDim, yDim } = this.getPopulation()
    const action = this.determineThresholdAction(state, population, xDim, yDim)

    if (action) {
      this.applyAction(action)
      this.scheduleFallback()
    }
  }

  private swapMostDominant(): void {
    if (!this.getState || !this.getPopulation || !this.applyAction) return

    const state = this.getState()
    if (state.colors.length === 0) return

    const { population, xDim, yDim } = this.getPopulation()
    const counts = getColorSuccessCounts(population, state.colors, xDim, yDim)
    const targetIndex = this.findMaxIndex(counts)
    const newColor = getUniqueRandomColor(state.currentPalette, state.colors)

    this.applyAction({ action: 'change', targetIndex, newColor })
  }

  private determineThresholdAction(
    state: ColorState,
    population: Uint8ClampedArray[][],
    xDim: number,
    yDim: number
  ): RandomAction | null {
    if (state.colors.length === 0) return null

    const totalCells = xDim * yDim
    if (totalCells === 0) return null

    const counts = getColorSuccessCounts(population, state.colors, xDim, yDim)
    const dominantIndices = this.findDominantColors(counts, totalCells)

    if (dominantIndices.length === 0) return null

    const targetIndex = this.selectRandomIndex(dominantIndices)
    const newColor = getUniqueRandomColor(state.currentPalette, state.colors)

    return { action: 'change', targetIndex, newColor }
  }

  private findDominantColors(counts: number[], totalCells: number): number[] {
    const dominantIndices: number[] = []

    for (let i = 0; i < counts.length; i++) {
      const percentage = counts[i] / totalCells
      if (percentage >= REPLACEMENT_THRESHOLD) {
        dominantIndices.push(i)
      }
    }

    return dominantIndices
  }

  private findMaxIndex(counts: number[]): number {
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

  private selectRandomIndex(indices: number[]): number {
    if (indices.length === 0) return 0
    return indices[Math.floor(Math.random() * indices.length)]
  }
}
