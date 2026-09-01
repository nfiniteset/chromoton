import { useState, useEffect, useMemo, useRef } from 'react'
import Chromoton from '../../Chromoton'
import CinemaControlPanel from './CinemaControlPanel'
import Scrubber from '../../components/Scrubber'
import VariantNav from '../../components/VariantNav'
import KeyboardControls from '../../components/KeyboardControls'
import CommandMenu from '../../components/CommandMenu'
import { useVideoImageMode } from './useVideoImageMode'
import { getRandomPaletteName } from '../../palettes'
import { useColorModel } from '../../hooks/useColorModel'
import { useColorRandomizer } from '../../hooks/useColorRandomizer'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut'
import { createStrategyById } from '../../strategies'
import { ThemeProvider } from '../../contexts/ThemeContext'

// Matches this folder's name — used to identify this variation in the
// VariantNav menu (see src/cinema/variants.js).
const VARIANT_ID = '2026-08-forsythe'

// Each variation gets its own localStorage namespace so changing a setting
// in one never leaks into another — see PLAN.md.
const STORAGE_PREFIX = `chromoton-cinema-${VARIANT_ID}`

// Same-directory-relative to cinema/index.html, so it resolves correctly
// whether served from dev root or nested under a deployed base path.
const VIDEO_SRC = 'media/forsythe_one_flat_thing_reproduced.mp4'

// Matches the video's native decoded resolution (see useVideoImageMode /
// fromVideoElement) so thumbnails never distort.
const PANEL_THUMB_WIDTH = 320
const PANEL_THUMB_HEIGHT = 180
const DRAG_THUMB_WIDTH = 120
const DRAG_THUMB_HEIGHT = 68

// The source video doesn't expose its true encoded frame rate through the
// HTMLVideoElement API, so frame-stepping assumes a standard rate.
const ASSUMED_FRAME_RATE = 24
const FRAME_DURATION = 1 / ASSUMED_FRAME_RATE
const FAST_STEP_FRAMES = 30

// Single source of truth for every persisted setting's default, shared
// between each useLocalStorage() call below and the panel's Reset button —
// so "reset to defaults" can never drift from what a fresh session actually
// starts with.
const DEFAULT_CLARITY = 480
const DEFAULT_FPS = 15
const DEFAULT_MONOCHROME = false
const DEFAULT_SOUND_ENABLED = false
const DEFAULT_PLAYBACK_RATE = 0.25
const DEFAULT_THRESHOLD = 35
const DEFAULT_AUTO_THRESHOLD = true
const DEFAULT_AUTO_THRESHOLD_TARGET_PERCENT = 30
const DEFAULT_AUTO_DIM_WHITE = true
const DEFAULT_AUTO_DIM_TARGET_PERCENT = 38
const DEFAULT_AGITATE_TARGET = false
const DEFAULT_SHOW_THUMBNAIL_OVERLAY = false
const DEFAULT_KEEP_PANEL_VISIBLE = false
// 95% black / 95% white rather than pure 0/255.
const DEFAULT_COLORS = [
  { r: 13, g: 13, b: 13 },
  { r: 242, g: 242, b: 242 },
]

function CinemaApp() {
  const [clarity, setClarity] = useLocalStorage(
    `${STORAGE_PREFIX}-clarity`,
    DEFAULT_CLARITY
  )
  // No UI to change this in cinema anymore (Spiciness/StrategySelector is
  // hidden here) — always 'none', never persisted, so a value saved by an
  // older build with that UI can't leak in on load.
  const strategyType = 'none'
  const [fps, setFps] = useLocalStorage(`${STORAGE_PREFIX}-fps`, DEFAULT_FPS)
  const [monochrome, setMonochrome] = useLocalStorage(
    `${STORAGE_PREFIX}-monochrome`,
    DEFAULT_MONOCHROME
  )
  const [soundEnabled, setSoundEnabled] = useLocalStorage(
    `${STORAGE_PREFIX}-soundEnabled`,
    DEFAULT_SOUND_ENABLED
  )
  const [playbackRate, setPlaybackRate] = useLocalStorage(
    `${STORAGE_PREFIX}-playbackRate`,
    DEFAULT_PLAYBACK_RATE
  )
  const [threshold, setThreshold] = useLocalStorage(
    `${STORAGE_PREFIX}-threshold`,
    DEFAULT_THRESHOLD
  )
  const [autoThreshold, setAutoThreshold] = useLocalStorage(
    `${STORAGE_PREFIX}-autoThreshold`,
    DEFAULT_AUTO_THRESHOLD
  )
  // Percent (0-100), matching chromoton.js's default autoThresholdTargetFraction.
  const [autoThresholdTargetPercent, setAutoThresholdTargetPercent] =
    useLocalStorage(
      `${STORAGE_PREFIX}-autoThresholdTargetPercent`,
      DEFAULT_AUTO_THRESHOLD_TARGET_PERCENT
    )
  const [autoDimWhite, setAutoDimWhite] = useLocalStorage(
    `${STORAGE_PREFIX}-autoDimWhite`,
    DEFAULT_AUTO_DIM_WHITE
  )
  // Percent (0-100), matching chromoton.js's default autoDimCoverageMax.
  const [autoDimTargetPercent, setAutoDimTargetPercent] = useLocalStorage(
    `${STORAGE_PREFIX}-autoDimTargetPercent`,
    DEFAULT_AUTO_DIM_TARGET_PERCENT
  )
  const [agitateTarget, setAgitateTarget] = useLocalStorage(
    `${STORAGE_PREFIX}-agitateTarget`,
    DEFAULT_AGITATE_TARGET
  )
  const [showThumbnailOverlay, setShowThumbnailOverlay] = useLocalStorage(
    `${STORAGE_PREFIX}-showThumbnailOverlay`,
    DEFAULT_SHOW_THUMBNAIL_OVERLAY
  )
  const [keepPanelVisible, setKeepPanelVisible] = useLocalStorage(
    `${STORAGE_PREFIX}-keepPanelVisible`,
    DEFAULT_KEEP_PANEL_VISIBLE
  )
  const [effectiveThreshold, setEffectiveThreshold] = useState(threshold)
  const [autoDimCoveragePercent, setAutoDimCoveragePercent] = useState(0)

  const [playing, setPlaying] = useState(true)
  const [videoFound, setVideoFound] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [panelState, setPanelState] = useState(
    /** @type {'open' | 'hidden'} */ ('open')
  )

  const [isDragging, setIsDragging] = useState(false)
  const [dragTime, setDragTime] = useState(0)

  const primaryVideoRef = useRef(/** @type {HTMLVideoElement | null} */ (null))
  const previewVideoRef = useRef(/** @type {HTMLVideoElement | null} */ (null))
  // Always-visible panel thumbnail (mirrors the primary video — whatever
  // frame is currently driving the sim, playing or paused).
  const panelThumbnailRef = useRef(
    /** @type {HTMLCanvasElement | null} */ (null)
  )
  // Same frame, mirrored into a second canvas for the standalone top-right
  // overlay shown when the panel is closed (see showThumbnailOverlay).
  const overlayThumbnailRef = useRef(
    /** @type {HTMLCanvasElement | null} */ (null)
  )
  // Floating thumbnail shown above the scrubber thumb while dragging
  // (mirrors the silent preview video, seeked to the drag position).
  const dragThumbnailRef = useRef(
    /** @type {HTMLCanvasElement | null} */ (null)
  )
  const seekInFlightRef = useRef(false)
  const pendingSeekRef = useRef(/** @type {number | null} */ (null))

  // Target colors always start at the defaults, never from localStorage —
  // there's no UI to change them in cinema, so nothing should ever persist.
  const initialPaletteName = useMemo(() => getRandomPaletteName(), [])

  const colorModel = useColorModel(initialPaletteName, DEFAULT_COLORS)

  const randomizationStrategy = useMemo(() => {
    return createStrategyById(strategyType)
  }, [strategyType])

  const colorState = useMemo(
    () => ({
      currentPalette: colorModel.currentPalette,
      colors: colorModel.colors,
    }),
    [colorModel.currentPalette, colorModel.colors]
  )

  useEffect(() => {
    if (window.chromoton) {
      window.chromoton.setStepInterval(Math.round(1000 / fps))
    }
  }, [fps])

  useEffect(() => {
    if (window.chromoton) {
      window.chromoton.setGrayscale(monochrome)
    }
  }, [monochrome])

  useEffect(() => {
    if (window.chromoton) {
      const colorsForSim = colorModel.getColorsForSimulation()
      window.chromoton.setTargetColors(colorsForSim)
    }
  }, [colorModel.colors, colorModel.getColorsForSimulation])

  useEffect(() => {
    window.chromoton?.setImageThreshold(threshold)
  }, [threshold])

  useEffect(() => {
    window.chromoton?.setAutoThreshold(autoThreshold)
  }, [autoThreshold])

  useEffect(() => {
    window.chromoton?.setAutoThresholdTargetFraction(
      autoThresholdTargetPercent / 100
    )
  }, [autoThresholdTargetPercent])

  // While auto threshold is on, the effective cutoff is computed fresh per
  // video frame (up to ~10/sec — see useVideoImageMode's throttle) rather
  // than being the `threshold` state itself, so poll it to keep the slider
  // reflecting what's actually in effect.
  useEffect(() => {
    if (!autoThreshold) return

    const poll = () => {
      const value = window.chromoton?.getEffectiveThreshold()
      if (value !== undefined) setEffectiveThreshold(value)
    }

    poll()
    const interval = setInterval(poll, 150)
    return () => clearInterval(interval)
  }, [autoThreshold])

  useEffect(() => {
    window.chromoton?.setAutoDim(autoDimWhite)
  }, [autoDimWhite])

  useEffect(() => {
    window.chromoton?.setAutoDimCoverageMax(autoDimTargetPercent / 100)
  }, [autoDimTargetPercent])

  // Like the auto-threshold poll above, but for auto-dim's measured white
  // coverage — the slider alone gives no sense of whether it's actually
  // doing anything on the current frame, so surface the live reading.
  useEffect(() => {
    if (!autoDimWhite) return

    const poll = () => {
      const value = window.chromoton?.getAutoDimCoverage()
      if (value !== undefined)
        setAutoDimCoveragePercent(Math.round(value * 100))
    }

    poll()
    const interval = setInterval(poll, 250)
    return () => clearInterval(interval)
  }, [autoDimWhite])

  useEffect(() => {
    window.chromoton?.setAgitateTarget(agitateTarget)
  }, [agitateTarget])

  useColorRandomizer(
    true,
    randomizationStrategy,
    colorState,
    colorModel.applyRandomAction
  )

  // Video element wiring: playback rate, mute, play/pause, and
  // duration/currentTime/error tracking for the Scrubber.
  useEffect(() => {
    const video = primaryVideoRef.current
    if (video) video.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    const video = primaryVideoRef.current
    if (video) video.muted = !soundEnabled
  }, [soundEnabled])

  useEffect(() => {
    const video = primaryVideoRef.current
    if (!video) return
    if (playing) {
      video.play().catch((err) => {
        // Autoplay can be rejected (e.g. an unfocused/backgrounded tab).
        // Sync state back to reality so the Play/Pause button reflects
        // what's actually happening instead of silently sitting stuck.
        console.warn('Cinema: video.play() was rejected:', err)
        setPlaying(false)
      })
    } else {
      video.pause()
    }
  }, [playing])

  useEffect(() => {
    const video = primaryVideoRef.current
    if (!video) return

    const handleLoadedMetadata = () => setDuration(video.duration)
    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleError = () => setVideoFound(false)
    // The browser can pause playback on its own (e.g. a power-saving
    // suspension policy for backgrounded/unfocused tabs), not just in
    // response to our own pause() calls — listen natively rather than
    // only driving state one-way, so the Play/Pause button never goes
    // stale relative to what's actually playing.
    const handlePlay = () => setPlaying(true)
    const handlePause = () => setPlaying(false)

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('error', handleError)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('error', handleError)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [])

  const imageColors = useMemo(() => {
    const [black, white] = colorModel.colors
    return black && white ? { black, white } : null
  }, [colorModel.colors])

  useVideoImageMode(primaryVideoRef, imageColors, videoFound)

  // Always-on panel thumbnail: mirrors whatever frame the primary video is
  // currently on — during playback (timeupdate), right after any seek
  // (including a paused scrub commit), and once the first frame is ready.
  useEffect(() => {
    const video = primaryVideoRef.current
    if (!video) return

    const drawInto = (canvas) => {
      if (!canvas || !video.videoWidth) return
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
    }

    const draw = () => {
      drawInto(panelThumbnailRef.current)
      drawInto(overlayThumbnailRef.current)
    }

    video.addEventListener('timeupdate', draw)
    video.addEventListener('seeked', draw)
    video.addEventListener('loadeddata', draw)
    draw()

    return () => {
      video.removeEventListener('timeupdate', draw)
      video.removeEventListener('seeked', draw)
      video.removeEventListener('loadeddata', draw)
    }
  }, [])

  // The overlay canvas only exists in the DOM while it's actually shown, so
  // it misses whatever frame the draw effect above last pushed — paint it
  // immediately on mount instead of waiting for the video's next event.
  useEffect(() => {
    if (!showThumbnailOverlay || panelState !== 'hidden') return
    const video = primaryVideoRef.current
    const canvas = overlayThumbnailRef.current
    if (!video || !canvas || !video.videoWidth) return
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
  }, [showThumbnailOverlay, panelState])

  // Drag-thumbnail: seeking the (silent, never-played) preview video is
  // async, so only draw once its 'seeked' event confirms the new frame is
  // decoded. Queue at most one pending seek so fast pointer movement during
  // a drag doesn't pile up a backlog of seeks.
  useEffect(() => {
    const video = previewVideoRef.current
    if (!video) return

    const drawThumbnail = () => {
      const canvas = dragThumbnailRef.current
      if (!canvas || !video.videoWidth) return
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
    }

    const handleSeeked = () => {
      drawThumbnail()
      seekInFlightRef.current = false
      if (pendingSeekRef.current !== null) {
        const next = pendingSeekRef.current
        pendingSeekRef.current = null
        seekInFlightRef.current = true
        video.currentTime = next
      }
    }

    video.addEventListener('seeked', handleSeeked)
    return () => video.removeEventListener('seeked', handleSeeked)
  }, [])

  const seekPreview = (time) => {
    const video = previewVideoRef.current
    if (!video) return
    if (seekInFlightRef.current) {
      pendingSeekRef.current = time
      return
    }
    seekInFlightRef.current = true
    video.currentTime = time
  }

  const commitSeek = (time) => {
    if (primaryVideoRef.current) primaryVideoRef.current.currentTime = time
  }

  // Space toggles play/pause. A focused button (e.g. the Scrubber's own
  // play/pause button) already toggles on space natively, so it's skipped
  // here rather than double-firing.
  useKeyboardShortcut({
    id: 'cinema-toggle-play',
    keys: [' '],
    label: 'Play / pause',
    handler: (e) => {
      if (e.target instanceof HTMLElement && e.target.tagName === 'BUTTON') {
        return
      }
      e.preventDefault()
      setPlaying((p) => !p)
    },
  })

  // Left/Right nudge one frame, Shift+Left/Right nudge 30.
  useKeyboardShortcut({
    id: 'cinema-frame-step',
    keys: ['ArrowLeft', 'ArrowRight'],
    label: 'Step frame (Shift = 30 frames)',
    handler: (e) => {
      const video = primaryVideoRef.current
      if (!video || !duration) return

      e.preventDefault()
      const frames = e.shiftKey ? FAST_STEP_FRAMES : 1
      const direction = e.key === 'ArrowRight' ? 1 : -1
      const next = Math.min(
        duration,
        Math.max(0, video.currentTime + frames * FRAME_DURATION * direction)
      )
      video.currentTime = next
    },
  })

  const handleScrubPointerDown = (e) => {
    setIsDragging(true)
    setDragTime(parseFloat(e.target.value))
  }

  // React's onChange for <input> actually listens to the native 'input'
  // event (not 'change'), so it fires on every drag tick, not just on
  // release — can't rely on it to detect "drag finished". While dragging,
  // this only updates the live preview; the primary video is committed
  // separately on pointerup. A keyboard-driven nudge (no preceding
  // pointerdown) has no "drag" to speak of, so it commits immediately.
  const handleScrubInput = (e) => {
    const time = parseFloat(e.target.value)
    if (isDragging) {
      setDragTime(time)
      seekPreview(time)
    } else {
      commitSeek(time)
    }
  }

  const handleScrubPointerUp = (e) => {
    if (!isDragging) return
    commitSeek(parseFloat(e.target.value))
    setIsDragging(false)
  }

  // Hover-scrub: preview a frame under the pointer without touching the
  // primary video. Scrubber already suppresses this while a real drag is in
  // progress, but guard here too since a drag's pointerup can land outside
  // the track and leave a trailing mousemove.
  const handleTrackHover = (time) => {
    if (isDragging) return
    seekPreview(time)
  }

  // Restores every persisted setting to the DEFAULT_* values above. Doesn't
  // touch playback state (currentTime, playing, etc.) — those are live
  // session state, not settings someone would want "reset".
  const handleReset = () => {
    setClarity(DEFAULT_CLARITY)
    setFps(DEFAULT_FPS)
    setMonochrome(DEFAULT_MONOCHROME)
    setSoundEnabled(DEFAULT_SOUND_ENABLED)
    setPlaybackRate(DEFAULT_PLAYBACK_RATE)
    setThreshold(DEFAULT_THRESHOLD)
    setAutoThreshold(DEFAULT_AUTO_THRESHOLD)
    setAutoThresholdTargetPercent(DEFAULT_AUTO_THRESHOLD_TARGET_PERCENT)
    setAutoDimWhite(DEFAULT_AUTO_DIM_WHITE)
    setAutoDimTargetPercent(DEFAULT_AUTO_DIM_TARGET_PERCENT)
    setAgitateTarget(DEFAULT_AGITATE_TARGET)
    setShowThumbnailOverlay(DEFAULT_SHOW_THUMBNAIL_OVERLAY)
    setKeepPanelVisible(DEFAULT_KEEP_PANEL_VISIBLE)
    colorModel.changeColor(0, DEFAULT_COLORS[0])
    colorModel.changeColor(1, DEFAULT_COLORS[1])
  }

  const scrubValue = isDragging ? dragTime : currentTime

  // Always rendered — mirrors the primary video's current frame at all
  // times, whether playing, paused, or mid-drag.
  const panelThumbnail = (
    <canvas
      ref={panelThumbnailRef}
      width={PANEL_THUMB_WIDTH}
      height={PANEL_THUMB_HEIGHT}
      className="h-auto w-full rounded-md border"
      style={{ borderColor: 'var(--ct-border)' }}
    />
  )

  // Standalone top-right overlay: shows the same thumbnail on its own,
  // outside the settings panel's themed subtree (hence a plain static
  // border rather than the panel's contrast-adaptive --ct-border), so a
  // frame stays visible even with the panel hidden — e.g. for screen
  // capture or a live performance.
  const showOverlay = showThumbnailOverlay && panelState === 'hidden'

  return (
    <ThemeProvider>
      <KeyboardControls />
      <CommandMenu />
      <VariantNav current={VARIANT_ID} hidden={panelState === 'hidden'} />

      <Chromoton
        width={clarity}
        autoStart={true}
        onToggleMonochrome={() => setMonochrome(!monochrome)}
      />

      <video
        ref={primaryVideoRef}
        src={VIDEO_SRC}
        loop
        playsInline
        muted={!soundEnabled}
        style={{
          // Full-viewport size and opacity:1 (not display:none/opacity:0/
          // tiny) — Chrome's autoplay power-saver suspends <video> elements
          // it considers invisible background content, which would
          // silently stall the frame source driving the sim. It's still
          // never actually seen: zIndex -1 tucks it fully behind the
          // opaque Chromoton canvas.
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />

      {/* Scrub-preview-only video — never played, never contributes frames
          to the sim, purely seeked on drag to generate the floating
          thumbnail shown above the scrubber thumb. */}
      <video
        ref={previewVideoRef}
        src={VIDEO_SRC}
        muted
        preload="auto"
        className="hidden"
      />

      {videoFound && showOverlay && (
        <div
          data-cinema-ui="thumbnail-overlay"
          className="pointer-events-none fixed top-5 right-5 z-[100] w-[180px] rounded-2xl bg-white/8 p-2 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl backdrop-saturate-[180%]"
        >
          <canvas
            ref={overlayThumbnailRef}
            width={PANEL_THUMB_WIDTH}
            height={PANEL_THUMB_HEIGHT}
            className="h-auto w-full rounded-md border border-white/15"
          />
        </div>
      )}

      {videoFound && (
        <Scrubber
          value={scrubValue}
          duration={duration}
          playing={playing}
          onTogglePlay={() => setPlaying((p) => !p)}
          onPointerDown={handleScrubPointerDown}
          onInput={handleScrubInput}
          onPointerUp={handleScrubPointerUp}
          onTrackHover={handleTrackHover}
          hidden={panelState === 'hidden'}
          isDragging={isDragging}
          dragThumbnailRef={dragThumbnailRef}
          dragThumbWidth={DRAG_THUMB_WIDTH}
          dragThumbHeight={DRAG_THUMB_HEIGHT}
        />
      )}

      <CinemaControlPanel
        onPanelStateChange={setPanelState}
        thumbnail={panelThumbnail}
        clarity={clarity}
        onClarityChange={setClarity}
        fps={fps}
        onFpsChange={setFps}
        videoFound={videoFound}
        soundEnabled={soundEnabled}
        onSoundChange={setSoundEnabled}
        playbackRate={playbackRate}
        onPlaybackRateChange={setPlaybackRate}
        threshold={autoThreshold ? effectiveThreshold : threshold}
        onThresholdChange={setThreshold}
        autoThreshold={autoThreshold}
        onAutoThresholdChange={setAutoThreshold}
        autoThresholdTargetPercent={autoThresholdTargetPercent}
        onAutoThresholdTargetPercentChange={setAutoThresholdTargetPercent}
        autoDimWhite={autoDimWhite}
        onAutoDimWhiteChange={setAutoDimWhite}
        autoDimTargetPercent={autoDimTargetPercent}
        onAutoDimTargetPercentChange={setAutoDimTargetPercent}
        autoDimCoveragePercent={autoDimCoveragePercent}
        agitateTarget={agitateTarget}
        onAgitateTargetChange={setAgitateTarget}
        showThumbnailOverlay={showThumbnailOverlay}
        onShowThumbnailOverlayChange={setShowThumbnailOverlay}
        keepPanelVisible={keepPanelVisible}
        onKeepPanelVisibleChange={setKeepPanelVisible}
        onReset={handleReset}
      />
    </ThemeProvider>
  )
}

export default CinemaApp
