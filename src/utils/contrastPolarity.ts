import chroma from 'chroma-js'
import type { Color } from '../models/colorModel'

export type Polarity = 'light' | 'dark'

/**
 * Returns which text polarity (light or dark) gives better WCAG contrast
 * against the given background color.
 */
export function bestPolarity(bgColor: Color): Polarity {
  const bg = chroma(bgColor.r, bgColor.g, bgColor.b)
  return chroma.contrast(bg, 'white') >= chroma.contrast(bg, 'black')
    ? 'light'
    : 'dark'
}

/**
 * Same as bestPolarity, but requires the winner to be `threshold` times better
 * than the current polarity before switching. Prevents flickering at the
 * light/dark boundary when the background color is changing continuously.
 */
export function bestPolarityWithHysteresis(
  bgColor: Color,
  current: Polarity,
  threshold = 1.25
): Polarity {
  const bg = chroma(bgColor.r, bgColor.g, bgColor.b)
  const contrastLight = chroma.contrast(bg, 'white')
  const contrastDark = chroma.contrast(bg, 'black')

  if (current === 'light') {
    return contrastLight * threshold > contrastDark ? 'light' : 'dark'
  } else {
    return contrastLight > contrastDark * threshold ? 'light' : 'dark'
  }
}
