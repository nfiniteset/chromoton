import type { Color } from '../../models/colorModel'

/**
 * The categorical palette for this variation.
 *
 * Unlike the depth-map ramp, order here carries no meaning — these are
 * labels, not a scale. Index *is* the class id, and must stay in step with
 * the class numbering in preprocess-segments.py: 0 everything that isn't a
 * dancer, 1 any dancer.
 *
 * The preprocessing writes each class at the luma sitting at the centre of
 * its quantization band, so the engine's indexed image mode recovers the
 * class exactly when `bands == SEGMENT_PALETTE.length`. That equality is
 * load-bearing: changing this array's length without re-running the
 * preprocessing to match will silently mis-decode every pixel.
 *
 * Note this is *not* equivalent to the ordinary two-color image mode
 * (setImageTargets): that thresholds the source's own luma, where this
 * decodes labels a segmentation model assigned. A dark-clothed dancer
 * against a bright floor lands on the same class as a bright one.
 *
 * 95% black / 95% white, matching every other variation rather than pure
 * 0/255.
 */
export const SEGMENT_PALETTE: Color[] = [
  { r: 13, g: 13, b: 13 }, // 0 — background and scene surfaces
  { r: 242, g: 242, b: 242 }, // 1 — dancers
]

/** Row labels for the panel's legend, parallel to SEGMENT_PALETTE. */
export const SEGMENT_LABELS: string[] = ['Scene', 'Dancers']
