import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

import AdvancedControls from '../components/AdvancedControls'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'

import Divider from '../components/primitives/Divider'
import Checkbox from '../components/primitives/Checkbox'
import SteppedSlider from '../components/primitives/Slider'
import Notice from '../components/primitives/Notice'
import SectionHeader from '../components/primitives/SectionHeader'

// Shell (panel open/hidden state, idle-hide, focus trap) duplicated from
// ../components/ControlPanel.jsx rather than shared, since that component
// isn't designed to accept extra injected sections and this page must not
// touch the existing app's code.
const OPENNESS = { open: 1, hidden: 0 }
const TRANSFORM = {
  open: 'translateX(0)',
  hidden: 'translateX(calc(100% + 20px))',
}
const IDLE_HIDE_DELAY = 3000

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

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
  agitateTarget,
  onAgitateTargetChange,
  showThumbnailOverlay,
  onShowThumbnailOverlayChange,
  onPanelStateChange,
  thumbnail,
  className = '',
}) {
  const { panelRef } = useTheme()
  const [panelState, setPanelState] = useState(
    /** @type {'open' | 'hidden'} */ ('open')
  )
  const [isClosing, setIsClosing] = useState(false)
  const panelStateRef = useRef(panelState)
  const idleTimerRef = useRef(
    /** @type {ReturnType<typeof setTimeout> | null} */ (null)
  )

  const goTo = useCallback(
    (nextState) => {
      if (nextState === panelStateRef.current) return
      const opening = OPENNESS[nextState] > OPENNESS[panelStateRef.current]
      panelStateRef.current = nextState
      // Only blur if the panel still actually owns focus — e.g. focus moved
      // out to open the command menu, this same transition to 'hidden' is
      // already underway (via the focus-out handler below) to reflect that,
      // and blurring unconditionally here would yank focus right back out of
      // wherever it just legitimately went.
      if (
        nextState === 'hidden' &&
        document.activeElement instanceof HTMLElement &&
        panelRef.current?.contains(document.activeElement)
      ) {
        document.activeElement.blur()
      }
      setIsClosing(!opening)
      setPanelState(nextState)
    },
    [panelRef]
  )

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
    label: 'Toggle thumbnail overlay',
    handler: () => onShowThumbnailOverlayChange(!showThumbnailOverlay),
  })

  const revealPanel = useCallback(() => {
    goTo('open')
    requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelector(FOCUSABLE_SELECTOR)
      if (focusable instanceof HTMLElement) focusable.focus()
    })
  }, [goTo, panelRef])

  const hidePanel = useCallback(() => goTo('hidden'), [goTo])

  // Keyboard-driven panel visibility: focus entering the panel opens it and
  // holds it open (see the idle-hide guard below); focus leaving it — via
  // Escape's blur fallback, or Tabbing past the last control — closes it
  // immediately rather than waiting on the mouse-idle timer, since a
  // keyboard user isn't moving the mouse at all.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const handleFocusIn = () => goTo('open')

    const handleFocusOut = (e) => {
      const next = e.relatedTarget
      if (next instanceof Node && panel.contains(next)) return
      goTo('hidden')
    }

    panel.addEventListener('focusin', handleFocusIn)
    panel.addEventListener('focusout', handleFocusOut)
    return () => {
      panel.removeEventListener('focusin', handleFocusIn)
      panel.removeEventListener('focusout', handleFocusOut)
    }
  }, [panelRef, goTo])

  // Tab with nothing focused document-wide enters the panel (which then
  // opens it via the focus-in rule above) instead of doing nothing, since
  // the panel is otherwise the only focusable content on the page.
  useEffect(() => {
    const handleTabIn = (e) => {
      if (e.key !== 'Tab') return
      const active = document.activeElement
      const nothingFocused =
        !active ||
        active === document.body ||
        active === document.documentElement
      if (!nothingFocused) return

      const focusable = panelRef.current?.querySelector(FOCUSABLE_SELECTOR)
      if (focusable instanceof HTMLElement) {
        e.preventDefault()
        focusable.focus()
      }
    }

    document.addEventListener('keydown', handleTabIn)
    return () => document.removeEventListener('keydown', handleTabIn)
  }, [panelRef])

  useEffect(() => {
    document.body.style.cursor = panelState === 'hidden' ? 'none' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [panelState])

  // Report state up so sibling UI (the Scrubber, rendered outside this
  // component) can fade in/out in sync with the panel.
  useEffect(() => {
    onPanelStateChange?.(panelState)
  }, [panelState, onPanelStateChange])

  // Clicking the sim toggles the panel (and, since the Scrubber's
  // visibility follows this same panelState, the Scrubber along with it).
  // Clicks on the panel itself or on the Scrubber bar (a sibling element,
  // marked with data-cinema-ui) don't count as "the sim".
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current?.contains(e.target)) return
      if (e.target.closest('[data-cinema-ui]')) return
      if (panelStateRef.current === 'open') {
        hidePanel()
      } else {
        revealPanel()
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [panelRef, revealPanel, hidePanel])

  useEffect(() => {
    const clearIdleTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
        idleTimerRef.current = null
      }
    }

    const scheduleIdleHide = () => {
      clearIdleTimer()
      idleTimerRef.current = setTimeout(() => {
        // A keyboard user tabbing through the panel isn't moving the mouse —
        // don't let this ambient timer yank focus out from under them.
        if (panelRef.current?.contains(document.activeElement)) return
        goTo('hidden')
      }, IDLE_HIDE_DELAY)
    }

    // Any movement reveals the panel. While the cursor is over the panel
    // itself or the Scrubber bar (a sibling, marked with data-cinema-ui),
    // don't schedule the idle-hide countdown — it should only creep back
    // in once the mouse moves off both of them, onto the sim.
    const handleMouseMove = (e) => {
      const overUI =
        panelRef.current?.contains(e.target) ||
        (e.target instanceof Element && !!e.target.closest('[data-cinema-ui]'))

      clearIdleTimer()
      goTo('open')
      if (!overUI) {
        scheduleIdleHide()
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    scheduleIdleHide()

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      clearIdleTimer()
    }
  }, [panelRef, goTo])

  const handlePanelKeyDown = (e) => {
    if (e.key !== 'Tab' || panelState !== 'open') return
    const container = e.currentTarget
    const focusable = Array.from(
      container.querySelectorAll(FOCUSABLE_SELECTOR)
    ).filter((el) => !el.closest('[inert]'))
    if (focusable.length < 2) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    }
  }

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
    <div
      className={cn(
        'pointer-events-none fixed top-0 right-0 z-[100] h-screen w-[400px]',
        className
      )}
      onKeyDown={handlePanelKeyDown}
    >
      {/* Main panel */}
      <div
        ref={panelRef}
        className="pointer-events-auto absolute top-5 right-5 box-border flex max-h-[calc(100vh-40px)] w-[220px] flex-col gap-4 overflow-x-hidden overflow-y-auto rounded-2xl bg-white/8 text-xs tracking-wider uppercase shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl backdrop-saturate-[180%] before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/30 before:via-white/5 before:to-white/10 before:[mask-composite:exclude] before:p-px before:content-[''] before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]"
        style={{
          transform: TRANSFORM[panelState],
          transition: `transform 200ms ${isClosing ? 'var(--ease-end-off-screen)' : 'var(--ease-begin-off-screen)'}, color var(--duration-color) ease-out, border-color var(--duration-color) ease-out`,
        }}
      >
        <div className="relative z-[1] overflow-x-hidden overflow-y-auto">
          <div className="flex flex-col">
            {videoFound && <div className="px-5 pt-5">{thumbnail}</div>}

            <div className="flex flex-col gap-7 px-5 py-7">
              {videoFound ? (
                <>
                  <Checkbox
                    label="Sound"
                    checked={soundEnabled}
                    onChange={onSoundChange}
                    className=""
                  />

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
                    label="Show thumbnail"
                    checked={showThumbnailOverlay}
                    onChange={onShowThumbnailOverlayChange}
                  />
                </>
              ) : (
                <Notice title="Movie not found">
                  Place a video at{' '}
                  <code>public/cinema/media/metropolis.mp4</code> and reload.
                </Notice>
              )}
            </div>

            {videoFound && (
              <>
                <Divider className="" />

                <div className="flex flex-col gap-7 px-5 py-7">
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
                      onThresholdChange(
                        THRESHOLD_STEPS[parseInt(e.target.value)]
                      )
                    }
                  />

                  {autoThreshold && (
                    <SteppedSlider
                      label="Auto target"
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

                <div className="flex flex-col gap-7 px-5 py-7">
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
                    <SteppedSlider
                      label="Auto dim target"
                      value={autoDimTargetStepIndex}
                      displayValue={`${PERCENT_STEPS[autoDimTargetStepIndex]}%`}
                      steps={PERCENT_STEPS}
                      onChange={(e) =>
                        onAutoDimTargetPercentChange(
                          PERCENT_STEPS[parseInt(e.target.value)]
                        )
                      }
                    />
                  )}
                </div>
              </>
            )}

            <Divider className="" />

            <div className="flex flex-col gap-7 px-5 py-7">
              <SectionHeader>Simulation</SectionHeader>

              <AdvancedControls
                hideStrategy
                clarity={clarity}
                fps={fps}
                onClarityChange={onClarityChange}
                onFpsChange={onFpsChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
