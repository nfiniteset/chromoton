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
import Typography from '../../components/primitives/Typography'

import { SEGMENT_PALETTE, SEGMENT_LABELS } from './segmentPalette'

// Marks non-panel UI (currently just the Scrubber) that should be treated as
// part of the same focus/hover/hide-prevention region as the panel itself.
const UI_SELECTOR = '[data-cinema-ui]'

const PLAYBACK_RATE_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

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
            <Notice title="Segment map not found">
              Generate one with{' '}
              <code>src/cinema/segments/preprocess-segments.py</code> into{' '}
              <code>public/cinema/segments/media/</code> and reload.
            </Notice>
          )}
        </div>

        {videoFound && (
          <>
            <Divider className="" />

            <div className="flex flex-col gap-5 p-5 pb-7">
              <SectionHeader>Segments</SectionHeader>

              {/* A legend, not a control: the class count is fixed by the
                  source video's encoding, so there is nothing here to tune
                  — but which color means which dancer is exactly what you
                  need to read while the piece is running. */}
              <div className="flex flex-col gap-2">
                {SEGMENT_PALETTE.map((color, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className="h-3 w-6 shrink-0 rounded-sm border"
                      style={{
                        backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                        borderColor: 'var(--ct-border)',
                      }}
                    />
                    <Typography as="span" intent="weak" className="text-[11px]">
                      {SEGMENT_LABELS[i]}
                    </Typography>
                  </div>
                ))}
              </div>
            </div>

            <Divider className="" />

            <div className="flex flex-col gap-5 p-5">
              <SectionHeader>Target color</SectionHeader>

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
