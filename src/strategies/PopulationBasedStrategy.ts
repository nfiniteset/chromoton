import type { Color, ColorState, RandomAction } from '../models/colorModel'
import type { RandomizationStrategy, StrategyMetadata } from './types'
import { PALETTES } from '../palettes'
import {
  getRandomColor,
  getUniqueRandomColor,
  getColorSuccessCounts,
} from '../utils/colorUtils'

export const metadata: StrategyMetadata = {
  id: 'population',
  name: 'Chill',
  description: 'Analyzes simulation to make smart decisions',
}

const MIN_CHANGE_TIME_MS = 8000 // 8 seconds
const MAX_CHANGE_TIME_MS = 15000 // 15 seconds

/**
 * Population-Based Randomization Strategy
 *
 * Analyzes the simulation population at random intervals (8-15 seconds)
 * to make intelligent decisions about which colors to change.
 *
 * Algorithm:
 * 1. Count how many cells have successfully matched each target color
 * 2. Identify the most successful color
 * 3. Replace the most successful color with a new one
 */
export class PopulationBasedStrategy implements RandomizationStrategy {
  private timeoutId: NodeJS.Timeout | null = null

  start(
    getState: () => ColorState,
    getPopulation: () => {
      population: Uint8ClampedArray[][]
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
      population: Uint8ClampedArray[][]
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
      const { population, xDim, yDim } = getPopulation()
      const action = this.determineAction(state, population, xDim, yDim)

      if (action) {
        applyAction(action)
      }

      // Schedule next change
      this.scheduleNextChange(getState, getPopulation, applyAction)
    }, delay)
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

    // Process: Find most successful color and replace it
    const counts = getColorSuccessCounts(population, state.colors, xDim, yDim)
    const mostSuccessfulIndex = this.findMaxIndex(counts)
    const newColor = this.getColorForChange(state, mostSuccessfulIndex)

    // Return: Change the most successful color
    return {
      action: 'change',
      targetIndex: mostSuccessfulIndex,
      newColor,
    }
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

  private getColorForChange(state: ColorState, excludeIndex: number): Color {
    const palette = PALETTES[state.currentPalette]
    const isCustomMode = palette === null

    if (isCustomMode) {
      return getRandomColor(state.currentPalette)
    }

    const availableColors = this.findAvailableColorsExcluding(
      state,
      excludeIndex
    )
    const hasAvailableColors = availableColors.length > 0

    return hasAvailableColors
      ? this.selectRandomFromArray(availableColors)!
      : getRandomColor(state.currentPalette)
  }

  private findAvailableColorsExcluding(
    state: ColorState,
    excludeIndex: number
  ): Color[] {
    const palette = PALETTES[state.currentPalette]
    if (!palette) {
      return []
    }

    const availableColors: Color[] = []

    for (const paletteColor of palette) {
      const isInUse = this.isColorInTargetsExcluding(
        paletteColor,
        state.colors,
        excludeIndex
      )

      if (!isInUse) {
        availableColors.push(paletteColor)
      }
    }

    return availableColors
  }

  private isColorInTargetsExcluding(
    paletteColor: Color,
    targetColors: Color[],
    excludeIndex: number
  ): boolean {
    for (let j = 0; j < targetColors.length; j++) {
      if (j === excludeIndex) {
        continue
      }

      const target = targetColors[j]
      if (
        target.r === paletteColor.r &&
        target.g === paletteColor.g &&
        target.b === paletteColor.b
      ) {
        return true
      }
    }

    return false
  }

  private selectRandomFromArray(colors: Color[]): Color | null {
    if (colors.length === 0) {
      return null
    }

    const index = Math.floor(Math.random() * colors.length)
    const selectedColor = colors[index]
    return {
      r: selectedColor.r,
      g: selectedColor.g,
      b: selectedColor.b,
    }
  }
}
