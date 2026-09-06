import type { Color } from '../../models/colorModel'

/**
 * The depth ramp for this variation, ordered far → near.
 *
 * Depth Anything V2 outputs *inverse* depth — near surfaces are bright,
 * far ones dark — and sampleImageIndices maps darkest luma to band 0, so
 * this array reads back-of-room first and dancer-closest-to-camera last.
 *
 * These are stops, not bands: buildDepthPalette interpolates between them
 * for whatever band count is in effect, so changing the band count doesn't
 * mean maintaining a separate palette per count. Two stops is all a plain
 * black-to-white ramp needs — interpolation fills in every step between —
 * but adding stops here is how you'd shape the ramp non-linearly, or bring
 * colour back into it.
 */
export const DEPTH_STOPS: Color[] = [
  { r: 13, g: 13, b: 13 }, // far — the same 95% black the other variations use
  { r: 242, g: 242, b: 242 }, // near — and their 95% white
]

export const MIN_BANDS = 2
export const MAX_BANDS = 8

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

/**
 * Resample a stop list into exactly `bands` evenly spaced colors, so band 0
 * is always the first stop and the last band always the last stop.
 *
 * Interpolation is straight RGB rather than a perceptual space — the OKLab
 * experiment (see PLAN.md) didn't earn its complexity here either, and the
 * sim's own convergence blurs band edges well before the ramp's evenness
 * would be noticeable.
 */
export function buildDepthPalette(stops: Color[], bands: number): Color[] {
  if (!stops.length) return []
  if (bands <= 1) return [stops[stops.length - 1]]

  const out: Color[] = []
  for (let i = 0; i < bands; i++) {
    const pos = (i / (bands - 1)) * (stops.length - 1)
    const lower = Math.floor(pos)
    const upper = Math.min(stops.length - 1, lower + 1)
    const t = pos - lower
    out.push({
      r: lerpChannel(stops[lower].r, stops[upper].r, t),
      g: lerpChannel(stops[lower].g, stops[upper].g, t),
      b: lerpChannel(stops[lower].b, stops[upper].b, t),
    })
  }
  return out
}
