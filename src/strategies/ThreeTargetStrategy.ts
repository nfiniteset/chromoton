import type { Color, ColorState, RandomAction } from '../models/colorModel'
import type { RandomizationStrategy, StrategyMetadata } from './types'
import { getColorSuccessCounts } from '../utils/colorUtils'
import { getUniqueRandomColor } from '../utils/colorUtils'

export const metadata: StrategyMetadata = {
  id: 'three-target',
  name: 'Drama',
  description: 'Replaces any color reaching 40%+',
}

const REPLACEMENT_THRESHOLD = 0.4 // 40%
const CHECK_INTERVAL_MS = 2000 // Check every 2 seconds

/**
 * Three-Target Strategy
 *
 * Checks every 2 seconds and immediately replaces any color
 * that reaches 40% or more of the population.
 *
 * Algorithm:
 * 1. Calculate population percentages for each color
 * 2. If any color reaches 40%+, replace it immediately
 * 3. If multiple colors reach threshold, replace one randomly
 */
export class ThreeTargetStrategy implements RandomizationStrategy {
  private intervalId: NodeJS.Timeout | null = null

  start(
    getState: () => ColorState,
    getPopulation: () => {
      population: Uint8ClampedArray[][]
      xDim: number
      yDim: number
    },
    applyAction: (action: RandomAction) => void
  ): void {
    // Check immediately on start
    this.checkAndAct(getState, getPopulation, applyAction)

    // Then check every 2 seconds
    this.intervalId = setInterval(() => {
      this.checkAndAct(getState, getPopulation, applyAction)
    }, CHECK_INTERVAL_MS)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private checkAndAct(
    getState: () => ColorState,
    getPopulation: () => {
      population: Uint8ClampedArray[][]
      xDim: number
      yDim: number
    },
    applyAction: (action: RandomAction) => void
  ): void {
    const state = getState()
    const { population, xDim, yDim } = getPopulation()
    const action = this.determineAction(state, population, xDim, yDim)

    if (action) {
      applyAction(action)
    }
  }

  private determineAction(
    state: ColorState,
    population: Uint8ClampedArray[][],
    xDim: number,
    yDim: number
  ): RandomAction | null {
    // Guard: Check if we have any colors
    if (state.colors.length === 0) {
      return null
    }

    // Guard: Check for valid population
    const totalCells = xDim * yDim
    if (totalCells === 0) {
      return null
    }

    // Process: Check for dominant colors and replace if needed
    const counts = getColorSuccessCounts(population, state.colors, xDim, yDim)
    const dominantIndices = this.findDominantColors(counts, totalCells)

    if (dominantIndices.length === 0) {
      return null
    }

    // Return: Replace one of the dominant colors
    const targetIndex = this.selectRandomIndex(dominantIndices)
    const newColor = getUniqueRandomColor(state.currentPalette, state.colors)

    return {
      action: 'change',
      targetIndex,
      newColor,
    }
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

  private selectRandomIndex(indices: number[]): number {
    if (indices.length === 0) {
      return 0
    }

    const randomArrayIndex = Math.floor(Math.random() * indices.length)
    return indices[randomArrayIndex]
  }
}
