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

import { MIN_BANDS, MAX_BANDS } from './environmentPalette'

// Marks non-panel UI (currently just the Scrubber) that should be treated as
// part of the same focus/hover/hide-prevention region as the panel itself.
const UI_SELECTOR = '[data-cinema-ui]'

const PLAYBACK_RATE_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
const LUMA_STEPS = Array.from({ length: 256 }, (_, i) => i)
const PERCENT_STEPS = Array.from({ length: 101 }, (_, i) => i)
const BAND_STEPS = Array.from(
  { length: MAX_BANDS - MIN_BANDS + 1 },
  (_, i) => MIN_BANDS + i
)

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

export default function CinemaControlPanel({
  clarity,
  onClarityChange,
  fps,
  onFpsChange,
  videoFound,
  soundEnabled,
  onSoundChange,
  playbackRate,
  onPlaybackRateChange,
  bands,
  onBandsChange,
  depthFar,
  onDepthFarChange,
  depthNear,
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

  const playbackStepIndex = closestStepIndex(PLAYBACK_RATE_STEPS, playbackRate)
  const bandStepIndex = closestStepIndex(BAND_STEPS, bands)
  const depthFarStepIndex = closestStepIndex(LUMA_STEPS, depthFar)
  const depthNearStepIndex = closestStepIndex(LUMA_STEPS, depthNear)
  const ceilingStepIndex = closestStepIndex(
    PERCENT_STEPS,
    autoDimCeilingPercent
  )

  return (
    <PanelShell
      panelRef={panelRef}
      panelState={panelState}
      isClosing={isClosing}
      className={className}
    >
      <div className="flex flex-col">
        {videoFound && <div className="px-5 pt-5">{thumbnail}</div>}

        <div className="flex flex-col gap-5 p-5">
          {videoFound ? (
            <>
              <SteppedSlider
                label="Playback speed"
                value={playbackStepIndex}
                displayValue={`${PLAYBACK_RATE_STEPS[playbackStepIndex]}x`}
                steps={PLAYBACK_RATE_STEPS}
                onChange={(e) =>
                  onPlaybackRateChange(
                    PLAYBACK_RATE_STEPS[parseInt(e.target.value)]
                  )
                }
              />

              <Checkbox
                label="Sound"
                checked={soundEnabled}
                onChange={onSoundChange}
                className=""
              />
            </>
          ) : (
            <Notice title="Source videos not found">
              This variation needs two: generate them with{' '}
              <code>src/cinema/hybrid/preprocess-depth.py</code> and{' '}
              <code>src/cinema/hybrid/preprocess-people.py</code> into{' '}
              <code>public/cinema/hybrid/media/</code> and reload.
            </Notice>
          )}
        </div>

        {videoFound && (
          <>
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

              {/* Far/near clamp which slice of the source's brightness is
                  spread across the bands, so a depth map whose subject sits
                  in a narrow range can still use the whole ramp. Each is
                  held a step clear of the other — a zero-width or inverted
                  range would collapse every cell onto one band. */}
              <SteppedSlider
                label="Far"
                value={depthFarStepIndex}
                displayValue={LUMA_STEPS[depthFarStepIndex]}
                steps={LUMA_STEPS}
                onChange={(e) =>
                  onDepthFarChange(
                    Math.min(
                      LUMA_STEPS[parseInt(e.target.value)],
                      depthNear - 1
                    )
                  )
                }
              />

              <SteppedSlider
                label="Near"
                value={depthNearStepIndex}
                displayValue={LUMA_STEPS[depthNearStepIndex]}
                steps={LUMA_STEPS}
                onChange={(e) =>
                  onDepthNearChange(
                    Math.max(LUMA_STEPS[parseInt(e.target.value)], depthFar + 1)
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

              {/* Not a band — the person mask arrives as a separate video
                  and takes this color regardless of how far away the dancer
                  is, so it needs to stay legible against every band in the
                  ramp above. */}
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

            {/* Applies across every environment band *and* the person
                overlay, so it can't live under either section — and it
                can't be called "Target color" here, since the People
                section now has a field by that name. */}
            <div className="flex flex-col gap-5 p-5">
              <SectionHeader>All targets</SectionHeader>

              <Checkbox
                label="Agitate"
                checked={agitateTarget}
                onChange={onAgitateTargetChange}
              />
            </div>
          </>
        )}

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
