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
import Typography from '../../components/primitives/Typography'
import SubtleButton from '../../components/primitives/Button'

// Marks non-panel UI (currently just the Scrubber) that should be treated as
// part of the same focus/hover/hide-prevention region as the panel itself.
const UI_SELECTOR = '[data-cinema-ui]'

const PLAYBACK_RATE_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
const THRESHOLD_STEPS = Array.from({ length: 256 }, (_, i) => i)
const PERCENT_STEPS = Array.from({ length: 101 }, (_, i) => i)

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
  threshold,
  onThresholdChange,
  autoThreshold,
  onAutoThresholdChange,
  autoThresholdTargetPercent,
  onAutoThresholdTargetPercentChange,
  autoDimWhite,
  onAutoDimWhiteChange,
  autoDimTargetPercent,
  onAutoDimTargetPercentChange,
  autoDimCoveragePercent,
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
    id: 'toggle-auto-threshold',
    keys: [],
    label: 'Toggle auto threshold',
    handler: () => onAutoThresholdChange(!autoThreshold),
  })

  useKeyboardShortcut({
    id: 'toggle-auto-dim-white',
    keys: [],
    label: 'Toggle auto dim white',
    handler: () => onAutoDimWhiteChange(!autoDimWhite),
  })

  useKeyboardShortcut({
    id: 'toggle-agitate-target',
    keys: [],
    label: 'Toggle agitate target color',
    handler: () => onAgitateTargetChange(!agitateTarget),
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
  const thresholdStepIndex = closestStepIndex(THRESHOLD_STEPS, threshold)
  const autoThresholdTargetStepIndex = closestStepIndex(
    PERCENT_STEPS,
    autoThresholdTargetPercent
  )
  const autoDimTargetStepIndex = closestStepIndex(
    PERCENT_STEPS,
    autoDimTargetPercent
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
            <Notice title="Movie not found">
              Place a video at{' '}
              <code>
                public/cinema/2026-09/media/forsythe_one_flat_thing_reproduced.mp4
              </code>{' '}
              and reload.
            </Notice>
          )}
        </div>

        {videoFound && (
          <>
            <Divider className="" />

            <div className="flex flex-col gap-5 p-5 pb-7">
              <SectionHeader>B/W Threshold</SectionHeader>

              <Checkbox
                label="Auto"
                checked={autoThreshold}
                onChange={onAutoThresholdChange}
              />

              <SteppedSlider
                label="Threshold"
                value={thresholdStepIndex}
                displayValue={THRESHOLD_STEPS[thresholdStepIndex]}
                steps={THRESHOLD_STEPS}
                disabled={autoThreshold}
                onChange={(e) =>
                  onThresholdChange(THRESHOLD_STEPS[parseInt(e.target.value)])
                }
              />

              {autoThreshold && (
                <SteppedSlider
                  label="White %"
                  value={autoThresholdTargetStepIndex}
                  displayValue={`${PERCENT_STEPS[autoThresholdTargetStepIndex]}%`}
                  steps={PERCENT_STEPS}
                  onChange={(e) =>
                    onAutoThresholdTargetPercentChange(
                      PERCENT_STEPS[parseInt(e.target.value)]
                    )
                  }
                />
              )}
            </div>

            <Divider className="" />

            <div className="flex flex-col gap-5 p-5">
              <SectionHeader>Target color</SectionHeader>

              <Checkbox
                label="Agitate"
                checked={agitateTarget}
                onChange={onAgitateTargetChange}
              />

              <Checkbox
                label="Auto dim"
                checked={autoDimWhite}
                onChange={onAutoDimWhiteChange}
              />

              {autoDimWhite && (
                <div className="flex flex-col gap-2">
                  <SteppedSlider
                    label="Dim ceiling"
                    value={autoDimTargetStepIndex}
                    displayValue={`${PERCENT_STEPS[autoDimTargetStepIndex]}%`}
                    steps={PERCENT_STEPS}
                    onChange={(e) =>
                      onAutoDimTargetPercentChange(
                        PERCENT_STEPS[parseInt(e.target.value)]
                      )
                    }
                  />
                  <Typography
                    as="p"
                    intent="weak"
                    className="text-[11px] tabular-nums"
                  >
                    Currently {autoDimCoveragePercent}%
                  </Typography>
                </div>
              )}
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
