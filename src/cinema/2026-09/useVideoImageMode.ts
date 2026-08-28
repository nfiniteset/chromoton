import { useEffect, useRef, type RefObject } from 'react'
import { fromVideoElement } from '../../utils/imageSource'
import type { Color } from '../../models/colorModel'

export interface VideoImageColors {
  black: Color
  white: Color
}

const MIN_APPLY_INTERVAL_MS = 100

/**
 * Continuously feeds the engine's image-mode from a playing <video>'s
 * current frame, using requestVideoFrameCallback (falling back to
 * requestAnimationFrame on browsers without it).
 *
 * Colors are read through a ref rather than an effect dependency so the
 * frame-callback chain isn't torn down and rebuilt every time the color
 * randomizer mutates the palette — only `active`/the video element restart
 * it. The actual engine call is throttled independently of the callback
 * rate, since setImageTargets does real per-cell work that doesn't need to
 * run at 24-60Hz.
 */
export function useVideoImageMode(
  videoRef: RefObject<HTMLVideoElement | null>,
  colors: VideoImageColors | null,
  active: boolean
): void {
  const colorsRef = useRef(colors)

  useEffect(() => {
    colorsRef.current = colors
  }, [colors])

  useEffect(() => {
    const video = videoRef.current
    if (!active || !video) return

    const source = fromVideoElement(video)
    const supportsRVFC = 'requestVideoFrameCallback' in video
    let handle: number | null = null
    let lastApplied = 0
    let stopped = false

    const sampleAndApply = () => {
      const currentColors = colorsRef.current
      if (!currentColors || !window.chromoton) return
      const now = performance.now()
      if (now - lastApplied < MIN_APPLY_INTERVAL_MS) return
      lastApplied = now
      source
        .getImageData()
        .then((imageData) => {
          if (!stopped) {
            window.chromoton?.setImageTargets(imageData, currentColors)
          }
        })
        .catch(() => {
          // video has no decoded dimensions yet — skip this frame
        })
    }

    const onFrame = () => {
      if (stopped) return
      sampleAndApply()
      handle = supportsRVFC
        ? video.requestVideoFrameCallback(onFrame)
        : requestAnimationFrame(onFrame)
    }

    const cancelHandle = () => {
      if (handle === null) return
      if (supportsRVFC) video.cancelVideoFrameCallback(handle)
      else cancelAnimationFrame(handle)
      handle = null
    }

    // rVFC self-stops once the video pauses (it only fires on new frames),
    // but the rAF fallback runs at display refresh regardless of video
    // state — explicitly cancel/restart it on pause/play so a paused video
    // doesn't leave a dangling busy loop.
    const start = () => {
      if (handle !== null || video.paused) return
      onFrame()
    }

    // The sampling loop above is stopped while paused, so scrubbing to a
    // new position while paused would otherwise never reach the sim. Seeks
    // fire their own 'seeked' event regardless of play state — do a single
    // untrottled sample+apply there whenever paused, so the sim targets
    // whatever frame was scrubbed to.
    const handleSeeked = () => {
      if (!video.paused) return
      const currentColors = colorsRef.current
      if (!currentColors || !window.chromoton) return
      lastApplied = performance.now()
      source
        .getImageData()
        .then((imageData) => {
          if (!stopped) {
            window.chromoton?.setImageTargets(imageData, currentColors)
          }
        })
        .catch(() => {})
    }

    video.addEventListener('play', start)
    video.addEventListener('pause', cancelHandle)
    video.addEventListener('seeked', handleSeeked)
    start()

    return () => {
      stopped = true
      video.removeEventListener('play', start)
      video.removeEventListener('pause', cancelHandle)
      video.removeEventListener('seeked', handleSeeked)
      cancelHandle()
    }
  }, [videoRef, active])
}
