import type { Color } from '../models/colorModel'
import type { ImageSource } from './imageSource'

export interface ImageTargetColors {
  black: Color
  white: Color
}

/**
 * Resolve an ImageSource and hand its ImageData to the engine, which
 * assigns each grid cell one of the two target colors depending on
 * whether it overlaps a black or white pixel.
 */
export async function applyImageMode(
  source: ImageSource,
  colors: ImageTargetColors
): Promise<void> {
  if (!window.chromoton) return
  const imageData = await source.getImageData()
  window.chromoton.setImageTargets(imageData, colors)
}

/** Disable image mode and return to the global target-color list. */
export function clearImageMode(): void {
  window.chromoton?.clearImageTargets()
}

export function isImageModeEnabled(): boolean {
  return window.chromoton?.isImageModeEnabled() ?? false
}
