import type { Color } from '../../models/colorModel'

/**
 * The environment ramp for the lidar variation, ordered far → near.
 *
 * Forked from the hybrid variation's, unchanged in behavior — the ramp is
 * the same idea driven by a different source. What changes is *why* far
 * comes first. Hybrid's depth video is Depth Anything V2's inverse depth
 * (near surfaces bright), so its luma is already nearness. The wire format
 * here is the opposite: the depth channel is metres, so 0 is the *nearest*
 * surface. useSocketImageMode flips it back to nearness during the channel
 * split, which leaves this file — and the engine's "darkest luma is band 0"
 * rule — reading exactly as they do in hybrid.
 *
 * People are not on this ramp at all. They arrive through the packed
 * frame's G channel as the engine's overlay (see chromoton.js's
 * setImageTargetsIndexed) and take their own color, one index past the last
 * band.
 */

/**
 * The ramp deliberately stops well short of white. People are not on it —
 * they sit above its near end — so a ramp running the full 13..242 the
 * other variations use would put the nearest environment band at exactly
 * the person color and make the dancers vanish into the floor in front of
 * them. Ending the environment mid-grey keeps the whole default palette
 * monochrome, as every other variation is, while leaving the dancers the
 * brightest thing on screen — the same reading Segments gives.
 */
export const DEFAULT_ENVIRONMENT_FAR: Color = { r: 13, g: 13, b: 13 }
export const DEFAULT_ENVIRONMENT_NEAR: Color = { r: 128, g: 128, b: 128 }

/** Default color for the person overlay — the 95% white the others use. */
export const DEFAULT_PERSON_COLOR: Color = { r: 242, g: 242, b: 242 }

export const MIN_BANDS = 2
export const MAX_BANDS = 8

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

/**
 * Resample a far→near stop pair into exactly `bands` evenly spaced colors,
 * so band 0 is always `far` and the last band always `near`.
 *
 * Interpolation is straight RGB rather than a perceptual space — the OKLab
 * experiment (see PLAN.md) didn't earn its complexity, and the sim's own
 * convergence blurs band edges well before the ramp's evenness would be
 * noticeable.
 */
export function buildEnvironmentPalette(
  far: Color,
  near: Color,
  bands: number
): Color[] {
  if (bands <= 1) return [near]

  const out: Color[] = []
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1)
    out.push({
      r: lerpChannel(far.r, near.r, t),
      g: lerpChannel(far.g, near.g, t),
      b: lerpChannel(far.b, near.b, t),
    })
  }
  return out
}
