import { PALETTES, type PaletteName } from '../palettes'
import type { Color } from '../models/colorModel'

export interface ChromotonCell {
  red: number
  green: number
  blue: number
}

/**
 * Generate a random color from a palette (or random if none/null palette)
 */
export function getRandomColor(paletteName: PaletteName): Color {
  const palette = PALETTES[paletteName]
  const isCustomMode = palette === null

  return isCustomMode
    ? generateRandomCustomColor()
    : selectRandomPaletteColor(palette)
}

function generateRandomCustomColor(): Color {
  let newColor: Color
  do {
    newColor = {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
    }
  } while (newColor.r + newColor.g + newColor.b > 400)
  return newColor
}

function selectRandomPaletteColor(palette: Color[]): Color {
  const index = Math.floor(Math.random() * palette.length)
  return {
    r: palette[index].r,
    g: palette[index].g,
    b: palette[index].b,
  }
}

/**
 * Get unique random colors from a palette
 * Returns an array of unique colors (no duplicates)
 */
export function getUniqueRandomColorsFromPalette(
  paletteName: PaletteName,
  count: number
): Color[] {
  const palette = PALETTES[paletteName]
  const isCustomMode = palette === null

  return isCustomMode
    ? generateCustomColors(paletteName, count)
    : selectShuffledPaletteColors(palette, count)
}

function generateCustomColors(
  paletteName: PaletteName,
  count: number
): Color[] {
  const colors: Color[] = []
  for (let i = 0; i < count; i++) {
    colors.push(getRandomColor(paletteName))
  }
  return colors
}

function selectShuffledPaletteColors(palette: Color[], count: number): Color[] {
  const shuffled = shuffleArray([...palette])
  const numColors = Math.min(count, shuffled.length)
  return shuffled.slice(0, numColors).map((color) => ({
    r: color.r,
    g: color.g,
    b: color.b,
  }))
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Get a single unique random color not already in target colors
 */
export function getUniqueRandomColor(
  paletteName: PaletteName,
  targetColors: Color[]
): Color {
  const palette = PALETTES[paletteName]
  const isCustomMode = palette === null

  if (isCustomMode) {
    return getRandomColor(paletteName)
  }

  const availableColors = findAvailableColors(palette, targetColors)
  const hasAvailableColors = availableColors.length > 0

  return hasAvailableColors
    ? selectRandomFromArray(availableColors)
    : getRandomColor(paletteName)
}

function findAvailableColors(palette: Color[], targetColors: Color[]): Color[] {
  const availableColors: Color[] = []
  for (let i = 0; i < palette.length; i++) {
    const paletteColor = palette[i]
    const isInUse = isColorInTargets(paletteColor, targetColors)

    if (!isInUse) {
      availableColors.push(paletteColor)
    }
  }
  return availableColors
}

function isColorInTargets(paletteColor: Color, targetColors: Color[]): boolean {
  for (let j = 0; j < targetColors.length; j++) {
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

function selectRandomFromArray(colors: Color[]): Color {
  const index = Math.floor(Math.random() * colors.length)
  const selectedColor = colors[index]
  return {
    r: selectedColor.r,
    g: selectedColor.g,
    b: selectedColor.b,
  }
}

/**
 * Count cells that have actually MATCHED each target color (low deviance)
 * This shows which colors have successfully dominated
 */
export function getColorSuccessCounts(
  population: ChromotonCell[][],
  targetColors: Color[],
  xDim: number,
  yDim: number,
  devianceThreshold: number = 20
): number[] {
  const counts = new Array(targetColors.length).fill(0)

  for (let y = 0; y < yDim; y++) {
    for (let x = 0; x < xDim; x++) {
      const cell = population[y][x]
      const cellR = cell.red
      const cellG = cell.green
      const cellB = cell.blue

      // Check each target to see if this cell has successfully matched it
      for (let i = 0; i < targetColors.length; i++) {
        const target = targetColors[i]
        const deviation =
          Math.abs(cellR - target.r) +
          Math.abs(cellG - target.g) +
          Math.abs(cellB - target.b)

        // If cell is close enough to this target, count it as a match
        if (deviation <= devianceThreshold) {
          counts[i]++
          break // Only count each cell once (for its best match)
        }
      }
    }
  }

  return counts
}

/**
 * Count which cells are closest to each target color
 * Every cell is assigned to exactly one target (its nearest)
 * Returns array where counts[i] = number of cells closest to targetColors[i]
 */
export function getClosestColorCounts(
  population: ChromotonCell[][],
  targetColors: Color[],
  xDim: number,
  yDim: number
): number[] {
  const counts = new Array(targetColors.length).fill(0)

  for (let y = 0; y < yDim; y++) {
    for (let x = 0; x < xDim; x++) {
      const cell = population[y][x]
      const cellR = cell.red
      const cellG = cell.green
      const cellB = cell.blue

      let minDeviation = Infinity
      let closestIndex = 0

      // Find which target this cell is closest to
      for (let i = 0; i < targetColors.length; i++) {
        const target = targetColors[i]
        const deviation =
          Math.abs(cellR - target.r) +
          Math.abs(cellG - target.g) +
          Math.abs(cellB - target.b)

        if (deviation < minDeviation) {
          minDeviation = deviation
          closestIndex = i
        }
      }

      counts[closestIndex]++
    }
  }

  return counts
}
