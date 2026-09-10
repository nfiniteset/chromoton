import { useMemo } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

import AdvancedControls from '../../components/AdvancedControls'
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut'
import { usePanelVisibility } from '../../components/panel/usePanelVisibility'
import PanelShell from '../../components/panel/PanelShell'

import Divider from '../../components/primitives/Divider'
import Checkbox from '../../components/primitives/Checkbox'
import SteppedSlider from '../../components/primitives/Slider'
import Notice from '../../components/primitives/Notice'
import SectionHeader from '../../components/primitives/SectionHeader'
import SubtleButton from '../../components/primitives/Button'
import ColorField from '../../components/primitives/ColorField'
import TextField from '../../components/primitives/TextField'
import Typography from '../../components/primitives/Typography'

import { MIN_BANDS, MAX_BANDS } from './environmentPalette'

// Marks non-panel UI (currently just the thumbnail overlay) that should be
// treated as part of the same focus/hover/hide-prevention region as the
// panel itself.
const UI_SELECTOR = '[data-cinema-ui]'

const PERCENT_STEPS = Array.from({ length: 101 }, (_, i) => i)
const BAND_STEPS = Array.from(
  { length: MAX_BANDS - MIN_BANDS + 1 },
  (_, i) => MIN_BANDS + i
)

// What each connection state should say to someone standing next to a
// phone wondering why nothing is happening. "Reconnecting" names the
// held-frame behavior explicitly, because a frozen image is otherwise
// indistinguishable from a working one that isn't moving.
const STATE_LABELS = {
  off: 'Not connected',
  connecting: 'Connecting…',
  live: 'Live',
  lost: 'Reconnecting — holding last frame',
  invalid: 'Unusable URL',
}

// ARKit's tracking states, as the phone spells them.
const TRACKING_LABELS = {
  normal: 'normal',
  limited: 'limited — the phone is moving too fast or seeing too little',
  notAvailable: 'unavailable',
}

function closestStepIndex(steps, value) {
  let bestIndex = 0
  let bestDiff = Infinity
  steps.forEach((step, index) => {
    const diff = Math.abs(step - value)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIndex = index
    }
  })
  return bestIndex
}

const round1 = (value) => Math.round(value * 10) / 10

export default function CinemaControlPanel({
  socketUrl,
  onSocketUrlChange,
  connected,
  onConnectedChange,
  status,
  clarity,
  onClarityChange,
  fps,
  onFpsChange,
  bands,
  onBandsChange,
  windowNear,
  windowFar,
  metreStep,
  depthFarM,
  onDepthFarChange,
  depthNearM,
  onDepthNearChange,
  environmentPalette,
  envFar,
  onEnvFarChange,
  envNear,
  onEnvNearChange,
  personColor,
  onPersonColorChange,
  autoDimPerson,
  onAutoDimPersonChange,
  autoDimCeilingPercent,
  onAutoDimCeilingPercentChange,
  personCoverage,
  agitateTarget,
  onAgitateTargetChange,
  showThumbnailOverlay,
  onShowThumbnailOverlayChange,
  keepPanelVisible,
  onKeepPanelVisibleChange,
  onReset,
  onPanelStateChange,
  thumbnail,
  className = '',
}) {
  const { panelRef } = useTheme()

  const { panelState, isClosing } = usePanelVisibility({
    panelRef,
    pinned: keepPanelVisible,
    uiSelector: UI_SELECTOR,
    onStateChange: onPanelStateChange,
  })

  // Command-palette-only entries (no keybinding — `keys: []` never matches
  // a keydown) for the checkboxes below, so they're searchable/runnable from
  // ⌘K without needing to open the panel first.
  useKeyboardShortcut({
    id: 'toggle-lidar-connection',
    keys: [],
    label: 'Connect / disconnect the LiDAR stream',
    handler: () => onConnectedChange(!connected),
  })

  useKeyboardShortcut({
    id: 'toggle-agitate-target',
    keys: [],
    label: 'Toggle agitate target color',
    handler: () => onAgitateTargetChange(!agitateTarget),
  })

  useKeyboardShortcut({
    id: 'toggle-auto-dim-person',
    keys: [],
    label: 'Toggle auto dim people',
    handler: () => onAutoDimPersonChange(!autoDimPerson),
  })

  useKeyboardShortcut({
    id: 'toggle-thumbnail-overlay',
    keys: [],
    label: 'Keep thumbnail visible',
    handler: () => onShowThumbnailOverlayChange(!showThumbnailOverlay),
  })

  useKeyboardShortcut({
    id: 'toggle-keep-panel-visible',
    keys: [],
    label: 'Toggle keep panel visible',
    handler: () => onKeepPanelVisibleChange(!keepPanelVisible),
  })

  // The Far/Near sliders are in real metres, stepped across whatever
  // quantization window the phone reported in its last header — so a
  // setting made against one configuration doesn't silently mean something
  // else against another.
  const metreSteps = useMemo(() => {
    const count = Math.round((windowFar - windowNear) / metreStep) + 1
    return Array.from({ length: Math.max(2, count) }, (_, i) =>
      round1(windowNear + i * metreStep)
    )
  }, [windowNear, windowFar, metreStep])

  const bandStepIndex = closestStepIndex(BAND_STEPS, bands)
  const depthFarStepIndex = closestStepIndex(metreSteps, depthFarM)
  const depthNearStepIndex = closestStepIndex(metreSteps, depthNearM)
  const ceilingStepIndex = closestStepIndex(
    PERCENT_STEPS,
    autoDimCeilingPercent
  )

  const header = status.header
  const maskUnavailable = !!header && !header.channels?.mask

  return (
    <PanelShell
      panelRef={panelRef}
      panelState={panelState}
      isClosing={isClosing}
      className={className}
    >
      <div className="flex flex-col">
        <div className="px-5 pt-5">{thumbnail}</div>

        <div className="flex flex-col gap-5 p-5">
          {/* The failure will happen during setup, not during the piece, so
              this section leads: URL, whether the socket is up, and the two
              readouts that say *why* a picture looks wrong rather than
              leaving someone staring at garbage. */}
          <SectionHeader>Connection</SectionHeader>

          <TextField
            label="URL"
            value={socketUrl}
            onCommit={onSocketUrlChange}
            placeholder="ws://127.0.0.1:8080/frames"
          />

          <Checkbox
            label="Connect"
            checked={connected}
            onChange={onConnectedChange}
            className=""
          />

          <div className="flex flex-col gap-1">
            <Typography as="span" className="text-[11px]">
              {STATE_LABELS[status.state] ?? status.state}
            </Typography>
            {status.state === 'live' && (
              <Typography
                as="span"
                intent="weak"
                className="text-[11px] tabular-nums"
              >
                {status.fps.toFixed(1)} fps
                {header ? ` · ${header.w}×${header.h}` : ''}
              </Typography>
            )}
            {header && (
              <Typography as="span" intent="weak" className="text-[11px]">
                Tracking: {TRACKING_LABELS[header.tracking] ?? header.tracking}
              </Typography>
            )}
          </div>

          {status.error && <Notice title="Connection">{status.error}</Notice>}

          {/* The phone says which signals it actually has. If segmentation
              isn't among them the sim renders bands only — the engine drops
              a missing overlay rather than half-applying it — and this is
              what stops that reading as a bug. */}
          {maskUnavailable && (
            <Notice title="No person mask">
              The phone reports person segmentation unavailable, so the overlay
              is off and the depth bands are rendering alone.
            </Notice>
          )}
        </div>

        <Divider className="" />

        <div className="flex flex-col gap-5 p-5 pb-7">
          <SectionHeader>Depth</SectionHeader>

          <div className="flex flex-col gap-2">
            <SteppedSlider
              label="Bands"
              value={bandStepIndex}
              displayValue={BAND_STEPS[bandStepIndex]}
              steps={BAND_STEPS}
              onChange={(e) =>
                onBandsChange(BAND_STEPS[parseInt(e.target.value)])
              }
            />
            {/* The ramp actually in effect — band count and the range
                sliders both reshape it, and neither is legible from the
                numbers alone. Ordered far → near, like the palette. */}
            <div
              className="flex h-3 overflow-hidden rounded-sm border"
              style={{ borderColor: 'var(--ct-border)' }}
            >
              {environmentPalette.map((color, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{
                    backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Real distances, not luma. The header carries the metric window
              the phone quantized against, which is the whole advantage of
              LiDAR over inferred depth — so these say where in the room the
              bands are spent, and stay put frame to frame. Each is held a
              step clear of the other: a zero-width or inverted range would
              collapse every cell onto one band. */}
          <SteppedSlider
            label="Far"
            value={depthFarStepIndex}
            displayValue={`${metreSteps[depthFarStepIndex].toFixed(1)} m`}
            steps={metreSteps}
            onChange={(e) =>
              onDepthFarChange(
                Math.max(
                  metreSteps[parseInt(e.target.value)],
                  round1(depthNearM + metreStep)
                )
              )
            }
          />

          <SteppedSlider
            label="Near"
            value={depthNearStepIndex}
            displayValue={`${metreSteps[depthNearStepIndex].toFixed(1)} m`}
            steps={metreSteps}
            onChange={(e) =>
              onDepthNearChange(
                Math.min(
                  metreSteps[parseInt(e.target.value)],
                  round1(depthFarM - metreStep)
                )
              )
            }
          />
        </div>

        <Divider className="" />

        <div className="flex flex-col gap-5 p-5">
          <SectionHeader>Environment</SectionHeader>

          {/* The two ends of the ramp above; every band between them is
              interpolated, so band count and these two colors are the
              whole of the environment's appearance. */}
          <ColorField
            label="Farthest"
            color={envFar}
            onChange={onEnvFarChange}
          />

          <ColorField
            label="Nearest"
            color={envNear}
            onChange={onEnvNearChange}
          />
        </div>

        <Divider className="" />

        <div className="flex flex-col gap-5 p-5">
          <SectionHeader>People</SectionHeader>

          {/* Not a band — the person mask arrives in its own channel of the
              same frame and takes this color regardless of how far away the
              performer is, so it needs to stay legible against every band
              in the ramp above. */}
          <ColorField
            label="Target color"
            color={personColor}
            onChange={onPersonColorChange}
          />

          <Checkbox
            label="Auto dim"
            checked={autoDimPerson}
            onChange={onAutoDimPersonChange}
          />

          {autoDimPerson && (
            <div className="flex flex-col gap-1">
              <SteppedSlider
                label="Dim ceiling"
                value={ceilingStepIndex}
                displayValue={`${PERCENT_STEPS[ceilingStepIndex]}%`}
                steps={PERCENT_STEPS}
                onChange={(e) =>
                  onAutoDimCeilingPercentChange(
                    PERCENT_STEPS[parseInt(e.target.value)]
                  )
                }
              />
              {/* Coverage at or above the ceiling dims the person color
                  as far as it goes. Showing what the frame is actually
                  at makes that a visible cause and effect rather than a
                  number set blind. */}
              <span
                className="text-xs opacity-60"
                style={{ color: 'var(--ct-text)' }}
              >
                Currently {Math.round((personCoverage ?? 0) * 100)}%
              </span>
            </div>
          )}
        </div>

        <Divider className="" />

        {/* Applies across every environment band *and* the person overlay,
            so it can't live under either section — and it can't be called
            "Target color" here, since the People section now has a field by
            that name. */}
        <div className="flex flex-col gap-5 p-5">
          <SectionHeader>All targets</SectionHeader>

          <Checkbox
            label="Agitate"
            checked={agitateTarget}
            onChange={onAgitateTargetChange}
          />
        </div>

        <Divider className="" />

        <div className="flex flex-col gap-5 p-5 pb-7">
          <SectionHeader>Simulation</SectionHeader>

          <AdvancedControls
            bare
            hideStrategy
            clarity={clarity}
            fps={fps}
            onClarityChange={onClarityChange}
            onFpsChange={onFpsChange}
          />
        </div>

        <Divider className="" />

        <SubtleButton className="justify-center px-5 py-4" onClick={onReset}>
          Reset
        </SubtleButton>
      </div>
    </PanelShell>
  )
}
