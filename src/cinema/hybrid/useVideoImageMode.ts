import { useEffect, useRef, type RefObject } from 'react'
import { fromVideoElement } from '../../utils/imageSource'
import type { Color } from '../../models/colorModel'

const MIN_APPLY_INTERVAL_MS = 100

// How far the mask may drift from the depth video before it is snapped back.
// Two elements playing the same timeline hold together to ~0.1ms over 30s
// while the tab is foregrounded, so this never fires in normal use. It fires
// when the tab is backgrounded: throttling there is applied per element and
// the two come apart by over a second, which does *not* recover on its own
// when the tab returns — dancers would stay stuck to the wrong moment of the
// environment for the rest of the session. One frame at 25fps is 40ms;
// 150ms is comfortably clear of ordinary jitter while still correcting long
// before the offset is visible.
const MAX_DRIFT_S = 0.15

/**
 * Feeds the engine's indexed image mode from *two* playing videos: a depth
 * map driving the environment bands, and a person mask lifted over it as
 * the engine's overlay.
 *
 * Forked from the depth-map variation's hook. The differences are all
 * consequences of there being two sources rather than one:
 *
 *  * Both frames are grabbed for the same apply, so the engine never sees a
 *    depth frame paired with a stale mask from the previous tick.
 *  * The depth video drives the frame callback. The mask is simply sampled
 *    at whatever frame it currently holds — it is a second element playing
 *    the same timeline, not something to be driven independently. Measured
 *    drift between two elements at 0.25x is ~0.1ms over 30s, and ≤12ms
 *    after a seek, well inside a frame either way (see
 *    docs/hybrid-pipeline.md).
 *  * If the mask has no decoded frame yet, the depth frame is applied
 *    without an overlay rather than being dropped — the environment renders
 *    and the people appear a frame later, which is far better than a
 *    stalled sim.
 *
 * The palette and person color are read through refs rather than effect
 * dependencies so the frame-callback chain isn't torn down and rebuilt
 * every time a color or the band count changes; only `active` and the video
 * elements restart it.
 */
export function useVideoImageMode(
  depthVideoRef: RefObject<HTMLVideoElement | null>,
  maskVideoRef: RefObject<HTMLVideoElement | null>,
  palette: Color[] | null,
  personColor: Color,
  active: boolean
): void {
  const paletteRef = useRef(palette)
  const personColorRef = useRef(personColor)

  useEffect(() => {
    paletteRef.current = palette
  }, [palette])

  useEffect(() => {
    personColorRef.current = personColor
  }, [personColor])

  useEffect(() => {
    const depthVideo = depthVideoRef.current
    if (!active || !depthVideo) return

    const depthSource = fromVideoElement(depthVideo)
    // The mask element can mount later than the depth one, so its source is
    // created lazily and re-checked each apply rather than captured here.
    let maskSource: ReturnType<typeof fromVideoElement> | null = null

    const supportsRVFC = 'requestVideoFrameCallback' in depthVideo
    let handle: number | null = null
    let lastApplied = 0
    let stopped = false

    const apply = async () => {
      const currentPalette = paletteRef.current
      if (!currentPalette?.length || !window.chromoton) return

      const maskVideo = maskVideoRef.current
      if (maskVideo && !maskSource) maskSource = fromVideoElement(maskVideo)

      // Snap the mask back if it has come adrift. Seeking is expensive and
      // visibly interrupts decoding, so it is done only past the threshold
      // rather than nudged every frame.
      if (
        maskVideo &&
        maskVideo.readyState >= 1 &&
        Math.abs(maskVideo.currentTime - depthVideo.currentTime) > MAX_DRIFT_S
      ) {
        maskVideo.currentTime = depthVideo.currentTime
      }

      let depthData: ImageData
      try {
        depthData = await depthSource.getImageData()
      } catch {
        return // depth video has no decoded dimensions yet
      }

      let overlay
      if (maskSource && maskVideo?.videoWidth) {
        try {
          overlay = {
            data: await maskSource.getImageData(),
            color: personColorRef.current,
          }
        } catch {
          overlay = undefined // fall through to bands-only for this frame
        }
      }

      if (!stopped) {
        window.chromoton?.setImageTargetsIndexed(
          depthData,
          currentPalette,
          overlay
        )
      }
    }

    const sampleAndApply = () => {
      const now = performance.now()
      if (now - lastApplied < MIN_APPLY_INTERVAL_MS) return
      lastApplied = now
      void apply()
    }

    const onFrame = () => {
      if (stopped) return
      sampleAndApply()
      handle = supportsRVFC
        ? depthVideo.requestVideoFrameCallback(onFrame)
        : requestAnimationFrame(onFrame)
    }

    const cancelHandle = () => {
      if (handle === null) return
      if (supportsRVFC) depthVideo.cancelVideoFrameCallback(handle)
      else cancelAnimationFrame(handle)
      handle = null
    }

    // rVFC self-stops once the video pauses (it only fires on new frames),
    // but the rAF fallback runs at display refresh regardless of video
    // state — explicitly cancel/restart it on pause/play so a paused video
    // doesn't leave a dangling busy loop.
    const start = () => {
      if (handle !== null || depthVideo.paused) return
      onFrame()
    }

    // The sampling loop above is stopped while paused, so scrubbing to a
    // new position while paused would otherwise never reach the sim. Seeks
    // fire their own 'seeked' event regardless of play state — do a single
    // unthrottled apply there whenever paused. Either video can be the one
    // that finishes seeking last, so both are listened to; the throttle is
    // deliberately bypassed so a scrub always lands.
    const handleSeeked = () => {
      if (!depthVideo.paused) return
      lastApplied = performance.now()
      void apply()
    }

    depthVideo.addEventListener('play', start)
    depthVideo.addEventListener('pause', cancelHandle)
    depthVideo.addEventListener('seeked', handleSeeked)
    const maskVideo = maskVideoRef.current
    maskVideo?.addEventListener('seeked', handleSeeked)
    start()

    return () => {
      stopped = true
      depthVideo.removeEventListener('play', start)
      depthVideo.removeEventListener('pause', cancelHandle)
      depthVideo.removeEventListener('seeked', handleSeeked)
      maskVideo?.removeEventListener('seeked', handleSeeked)
      cancelHandle()
    }
  }, [depthVideoRef, maskVideoRef, active])
}
