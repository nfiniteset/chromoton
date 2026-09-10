import { useState, useEffect, useMemo, useRef } from 'react'
import Chromoton from '../../Chromoton'
import CinemaControlPanel from './CinemaControlPanel'
import VariantNav from '../../components/VariantNav'
import KeyboardControls from '../../components/KeyboardControls'
import CommandMenu from '../../components/CommandMenu'
import { useSocketImageMode, lumaForMetres } from './useSocketImageMode'
import {
  DEFAULT_ENVIRONMENT_FAR,
  DEFAULT_ENVIRONMENT_NEAR,
  DEFAULT_PERSON_COLOR,
  buildEnvironmentPalette,
} from './environmentPalette'
import { getRandomPaletteName } from '../../palettes'
import { useColorModel } from '../../hooks/useColorModel'
import { useColorRandomizer } from '../../hooks/useColorRandomizer'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { createStrategyById } from '../../strategies'
import { ThemeProvider } from '../../contexts/ThemeContext'

// Matches this folder's name — used to identify this variation in the
// VariantNav menu (see src/cinema/variants.js).
const VARIANT_ID = 'lidar'

// Each variation gets its own localStorage namespace so changing a setting
// in one never leaks into another — see PLAN.md.
const STORAGE_PREFIX = `chromoton-cinema-${VARIANT_ID}`

// No video source at all — this variation's frames arrive over a socket
// from a phone (or, until the phone app exists, from mock-server.py in this
// folder). See docs/live-lidar-input.md.
//
// 127.0.0.1 rather than localhost, deliberately. Both the USB path
// (`iproxy 8080 8080`) and the mock server bind IPv4, while `localhost`
// resolves to ::1 first in every current browser — so anything else
// listening on the IPv6 loopback at the same port (a dev server, say) wins
// the name and the connection quietly goes to the wrong process. Naming the
// family removes the ambiguity. For the wireless path, replace the host
// with the phone's own IP; nothing else about the URL changes.
const DEFAULT_SOCKET_URL = 'ws://127.0.0.1:8080/frames'
const DEFAULT_CONNECTED = true

// The phone's depth map is natively 256x192, so the thumbnail is 4:3 rather
// than the 16:9 the video-backed variations use.
const PANEL_THUMB_WIDTH = 320
const PANEL_THUMB_HEIGHT = 240

// Fallback depth window, in metres, for before the first header arrives —
// ARKit's own defaults for a room-scale scene. Once a frame lands, the
// header's near/far replace these and the sliders re-scale to them.
const FALLBACK_NEAR_M = 0.5
const FALLBACK_FAR_M = 5.0
const METRE_STEP = 0.1

// Single source of truth for every persisted setting's default, shared
// between each useLocalStorage() call below and the panel's Reset button —
// so "reset to defaults" can never drift from what a fresh session actually
// starts with.
const DEFAULT_CLARITY = 320
const DEFAULT_FPS = 15
const DEFAULT_MONOCHROME = false
// How many depth bands the source is quantized into — i.e. how many
// distinct target colors are in play at once. 6, as in hybrid: at 4 a
// standing figure falls into the same band as the wall behind them.
const DEFAULT_BANDS = 6
// The two ends of the environment ramp; every band between them is
// interpolated.
const DEFAULT_ENV_FAR = DEFAULT_ENVIRONMENT_FAR
const DEFAULT_ENV_NEAR = DEFAULT_ENVIRONMENT_NEAR
// The overlay color — what a cell takes when the mask says "person" —
// independent of the ramp behind it.
const DEFAULT_PERSON = DEFAULT_PERSON_COLOR
const DEFAULT_AUTO_DIM_PERSON = false
const DEFAULT_AUTO_DIM_CEILING_PERCENT = 40
// The slice of the depth window spread across those bands, in metres
// rather than luma — the header carries real distances, so there is no
// reason to make someone think in 0-255 here. Defaults to the whole of the
// fallback window; the clamp effect below folds it into whatever window the
// phone actually reports.
const DEFAULT_DEPTH_FAR_M = FALLBACK_FAR_M
const DEFAULT_DEPTH_NEAR_M = FALLBACK_NEAR_M
const DEFAULT_AGITATE_TARGET = false
const DEFAULT_SHOW_THUMBNAIL_OVERLAY = false
const DEFAULT_KEEP_PANEL_VISIBLE = false
// 95% black / 95% white rather than pure 0/255.
const DEFAULT_COLORS = [
  { r: 13, g: 13, b: 13 },
  { r: 242, g: 242, b: 242 },
]

const round1 = (value) => Math.round(value * 10) / 10
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value))

function CinemaApp() {
  const [socketUrl, setSocketUrl] = useLocalStorage(
    `${STORAGE_PREFIX}-socketUrl`,
    DEFAULT_SOCKET_URL
  )
  const [connected, setConnected] = useLocalStorage(
    `${STORAGE_PREFIX}-connected`,
    DEFAULT_CONNECTED
  )
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
  const [bands, setBands] = useLocalStorage(
    `${STORAGE_PREFIX}-bands`,
    DEFAULT_BANDS
  )
  const [depthFarM, setDepthFarM] = useLocalStorage(
    `${STORAGE_PREFIX}-depthFarM`,
    DEFAULT_DEPTH_FAR_M
  )
  const [depthNearM, setDepthNearM] = useLocalStorage(
    `${STORAGE_PREFIX}-depthNearM`,
    DEFAULT_DEPTH_NEAR_M
  )
  const [envFar, setEnvFar] = useLocalStorage(
    `${STORAGE_PREFIX}-envFar`,
    DEFAULT_ENV_FAR
  )
  const [envNear, setEnvNear] = useLocalStorage(
    `${STORAGE_PREFIX}-envNear`,
    DEFAULT_ENV_NEAR
  )
  const [personColor, setPersonColor] = useLocalStorage(
    `${STORAGE_PREFIX}-personColor`,
    DEFAULT_PERSON
  )
  const [autoDimPerson, setAutoDimPerson] = useLocalStorage(
    `${STORAGE_PREFIX}-autoDimPerson`,
    DEFAULT_AUTO_DIM_PERSON
  )
  const [autoDimCeilingPercent, setAutoDimCeilingPercent] = useLocalStorage(
    `${STORAGE_PREFIX}-autoDimCeilingPercent`,
    DEFAULT_AUTO_DIM_CEILING_PERCENT
  )
  const [personCoverage, setPersonCoverage] = useState(0)
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
  const [panelState, setPanelState] = useState(
    /** @type {'open' | 'hidden'} */ ('open')
  )

  // Always-visible panel thumbnail, mirroring the most recent frame the
  // socket delivered, plus the same frame in the standalone top-right
  // overlay shown when the panel is closed (see showThumbnailOverlay).
  const panelThumbnailRef = useRef(
    /** @type {HTMLCanvasElement | null} */ (null)
  )
  const overlayThumbnailRef = useRef(
    /** @type {HTMLCanvasElement | null} */ (null)
  )
  const previewRefs = useMemo(
    () => [panelThumbnailRef, overlayThumbnailRef],
    []
  )

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
    window.chromoton?.setAgitateTarget(agitateTarget)
  }, [agitateTarget])

  // Auto-dim is defined against a single distinguished color. In this
  // variation that's the person overlay, not the ramp — the engine measures
  // overlay coverage and dims the person color by it (see chromoton.js's
  // measureAutoDim).
  useEffect(() => {
    window.chromoton?.setAutoDim(autoDimPerson)
  }, [autoDimPerson])

  useEffect(() => {
    window.chromoton?.setAutoDimCoverageMax(autoDimCeilingPercent / 100)
  }, [autoDimCeilingPercent])

  // Live readout of how much of the grid the mask currently claims, so the
  // Dim ceiling slider shows cause and effect instead of being set blind.
  // Only polled while auto-dim is on, since that's the only time the engine
  // is measuring at all.
  useEffect(() => {
    if (!autoDimPerson) return
    const id = setInterval(() => {
      setPersonCoverage(window.chromoton?.getAutoDimCoverage() ?? 0)
    }, 250)
    return () => clearInterval(id)
  }, [autoDimPerson])

  useColorRandomizer(
    true,
    randomizationStrategy,
    colorState,
    colorModel.applyRandomAction
  )

  // The ramp resampled to whatever band count is in effect. Rebuilt when
  // the count or either end changes, since useSocketImageMode hands this
  // straight to the engine on every applied frame.
  const environmentPalette = useMemo(
    () => buildEnvironmentPalette(envFar, envNear, bands),
    [envFar, envNear, bands]
  )

  const status = useSocketImageMode({
    url: socketUrl,
    palette: environmentPalette,
    personColor,
    enabled: connected,
    previewRefs,
  })

  // The quantization window the phone is actually using, which is what
  // makes the Far/Near sliders real distances rather than arbitrary units.
  // Falls back to ARKit's room-scale defaults until a header arrives, so
  // the panel is never showing a blank or nonsensical scale.
  const windowNear = status.header?.near ?? FALLBACK_NEAR_M
  const windowFar = status.header?.far ?? FALLBACK_FAR_M

  // A phone configured with a different window would otherwise leave the
  // stored slider positions outside it — and two values clamped to the same
  // end would collapse every cell onto one band. Folded in here rather than
  // in the panel so the constraint holds even with the panel closed.
  useEffect(() => {
    const nextNear = round1(
      clamp(depthNearM, windowNear, windowFar - METRE_STEP)
    )
    const nextFar = round1(clamp(depthFarM, nextNear + METRE_STEP, windowFar))
    if (nextNear !== depthNearM) setDepthNearM(nextNear)
    if (nextFar !== depthFarM) setDepthFarM(nextFar)
  }, [
    windowNear,
    windowFar,
    depthNearM,
    depthFarM,
    setDepthNearM,
    setDepthFarM,
  ])

  // Metres in the panel, luma at the engine. The translation lives in
  // lumaForMetres, next to the channel split whose inversion it undoes.
  useEffect(() => {
    window.chromoton?.setImageDepthRange(
      lumaForMetres(depthFarM, windowNear, windowFar),
      lumaForMetres(depthNearM, windowNear, windowFar)
    )
  }, [depthFarM, depthNearM, windowNear, windowFar])

  // Restores every persisted setting to the DEFAULT_* values above. Doesn't
  // touch the connection — whether the socket is up is live session state,
  // not a setting someone would want "reset" mid-show.
  const handleReset = () => {
    setSocketUrl(DEFAULT_SOCKET_URL)
    setClarity(DEFAULT_CLARITY)
    setFps(DEFAULT_FPS)
    setMonochrome(DEFAULT_MONOCHROME)
    setBands(DEFAULT_BANDS)
    setEnvFar(DEFAULT_ENV_FAR)
    setEnvNear(DEFAULT_ENV_NEAR)
    setPersonColor(DEFAULT_PERSON)
    setAutoDimPerson(DEFAULT_AUTO_DIM_PERSON)
    setAutoDimCeilingPercent(DEFAULT_AUTO_DIM_CEILING_PERCENT)
    setDepthFarM(DEFAULT_DEPTH_FAR_M)
    setDepthNearM(DEFAULT_DEPTH_NEAR_M)
    setAgitateTarget(DEFAULT_AGITATE_TARGET)
    setShowThumbnailOverlay(DEFAULT_SHOW_THUMBNAIL_OVERLAY)
    setKeepPanelVisible(DEFAULT_KEEP_PANEL_VISIBLE)
    colorModel.changeColor(0, DEFAULT_COLORS[0])
    colorModel.changeColor(1, DEFAULT_COLORS[1])
  }

  // Always rendered — mirrors the most recent frame, live or held.
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

      {showOverlay && (
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

      <CinemaControlPanel
        onPanelStateChange={setPanelState}
        thumbnail={panelThumbnail}
        socketUrl={socketUrl}
        onSocketUrlChange={setSocketUrl}
        connected={connected}
        onConnectedChange={setConnected}
        status={status}
        clarity={clarity}
        onClarityChange={setClarity}
        fps={fps}
        onFpsChange={setFps}
        bands={bands}
        onBandsChange={setBands}
        windowNear={windowNear}
        windowFar={windowFar}
        metreStep={METRE_STEP}
        depthFarM={depthFarM}
        onDepthFarChange={setDepthFarM}
        depthNearM={depthNearM}
        onDepthNearChange={setDepthNearM}
        environmentPalette={environmentPalette}
        envFar={envFar}
        onEnvFarChange={setEnvFar}
        envNear={envNear}
        onEnvNearChange={setEnvNear}
        personColor={personColor}
        onPersonColorChange={setPersonColor}
        autoDimPerson={autoDimPerson}
        onAutoDimPersonChange={setAutoDimPerson}
        autoDimCeilingPercent={autoDimCeilingPercent}
        onAutoDimCeilingPercentChange={setAutoDimCeilingPercent}
        personCoverage={personCoverage}
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
