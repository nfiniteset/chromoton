import { useState, useEffect, useMemo, useRef } from 'react'
import Chromoton from '../Chromoton'
import CinemaControlPanel from './CinemaControlPanel'
import Scrubber from './Scrubber'
import KeyboardControls from '../components/KeyboardControls'
import CommandMenu from '../components/CommandMenu'
import { useVideoImageMode } from './useVideoImageMode'
import { PALETTES, getRandomPaletteName } from '../palettes'
import { getColorSuccessCounts } from '../utils/colorUtils'
import { useColorModel } from '../hooks/useColorModel'
import { useColorRandomizer } from '../hooks/useColorRandomizer'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { createStrategyById } from '../strategies'
import { ThemeProvider } from '../contexts/ThemeContext'

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

function CinemaApp() {
  const [clarity, setClarity] = useLocalStorage('chromoton-cinema-clarity', 320)
  const [strategyType, setStrategyType] = useLocalStorage(
    'chromoton-cinema-strategyType',
    'none'
  )
  const [showPopulation, setShowPopulation] = useLocalStorage(
    'chromoton-cinema-showPopulation',
    false
  )
  const [fps, setFps] = useLocalStorage('chromoton-cinema-fps', 15)
  const [monochrome, setMonochrome] = useLocalStorage(
    'chromoton-cinema-monochrome',
    false
  )
  const [soundEnabled, setSoundEnabled] = useLocalStorage(
    'chromoton-cinema-soundEnabled',
    false
  )
  const [playbackRate, setPlaybackRate] = useLocalStorage(
    'chromoton-cinema-playbackRate',
    0.5
  )
  const [threshold, setThreshold] = useLocalStorage(
    'chromoton-cinema-threshold',
    35
  )
  const [populationPercentages, setPopulationPercentages] = useState(
    /** @type {number[]} */ ([])
  )

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
  // Floating thumbnail shown above the scrubber thumb while dragging
  // (mirrors the silent preview video, seeked to the drag position).
  const dragThumbnailRef = useRef(
    /** @type {HTMLCanvasElement | null} */ (null)
  )
  const seekInFlightRef = useRef(false)
  const pendingSeekRef = useRef(/** @type {number | null} */ (null))

  const initialPaletteName = useMemo(() => {
    try {
      const stored = window.localStorage.getItem('chromoton-cinema-palette')
      return stored ? JSON.parse(stored) : getRandomPaletteName()
    } catch {
      return getRandomPaletteName()
    }
  }, [])

  const initialColors = useMemo(() => {
    try {
      const stored = window.localStorage.getItem('chromoton-cinema-colors')
      return stored
        ? JSON.parse(stored)
        : [
            { r: 0, g: 0, b: 0 },
            { r: 255, g: 255, b: 255 },
          ]
    } catch {
      return [
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
      ]
    }
  }, [])

  const colorModel = useColorModel(initialPaletteName, initialColors)

  useEffect(() => {
    window.localStorage.setItem(
      'chromoton-cinema-palette',
      JSON.stringify(colorModel.currentPalette)
    )
  }, [colorModel.currentPalette])

  useEffect(() => {
    window.localStorage.setItem(
      'chromoton-cinema-colors',
      JSON.stringify(colorModel.colors)
    )
  }, [colorModel.colors])

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
    if (!showPopulation) return

    const calculatePercentages = () => {
      if (window.chromoton && window.chromoton.getPopulation) {
        const { population, xDim, yDim } = window.chromoton.getPopulation()
        const counts = getColorSuccessCounts(
          population,
          colorModel.colors,
          xDim,
          yDim,
          20
        )
        const totalCells = xDim * yDim

        const percentages = counts.map((count) =>
          totalCells > 0 ? (count / totalCells) * 100 : 0
        )

        setPopulationPercentages(percentages)
      }
    }

    calculatePercentages()
    const interval = setInterval(calculatePercentages, 500)

    return () => {
      clearInterval(interval)
      setPopulationPercentages([])
    }
  }, [showPopulation, colorModel.colors])

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

    const draw = () => {
      const canvas = panelThumbnailRef.current
      if (!canvas || !video.videoWidth) return
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
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

  const handleColorChange = (index, r, g, b) => {
    if (
      index === undefined ||
      r === undefined ||
      g === undefined ||
      b === undefined
    ) {
      return
    }
    colorModel.changeColor(index, { r, g, b })
  }

  return (
    <ThemeProvider>
      <KeyboardControls />
      <CommandMenu />

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

      {videoFound && (
        <Scrubber
          value={scrubValue}
          duration={duration}
          playing={playing}
          onTogglePlay={() => setPlaying((p) => !p)}
          onPointerDown={handleScrubPointerDown}
          onInput={handleScrubInput}
          onPointerUp={handleScrubPointerUp}
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
        palettes={Object.keys(PALETTES)}
        currentPalette={colorModel.currentPalette}
        colors={colorModel.colors}
        strategyType={strategyType}
        clarity={clarity}
        showPopulation={showPopulation}
        populationPercentages={populationPercentages}
        onPaletteChange={colorModel.setPalette}
        onStrategyChange={setStrategyType}
        onColorChange={handleColorChange}
        onRemoveColor={colorModel.removeColor}
        onSwapColor={colorModel.swapColor}
        onAddColor={colorModel.addColor}
        onClarityChange={setClarity}
        fps={fps}
        onFpsChange={setFps}
        onShowPopulationChange={setShowPopulation}
        videoFound={videoFound}
        soundEnabled={soundEnabled}
        onSoundChange={setSoundEnabled}
        playbackRate={playbackRate}
        onPlaybackRateChange={setPlaybackRate}
        threshold={threshold}
        onThresholdChange={setThreshold}
      />
    </ThemeProvider>
  )
}

export default CinemaApp
