import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

import PalettePicker from '../components/PalettePicker'
import ColorList from '../components/ColorList'
import AdvancedControls from '../components/AdvancedControls'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'

import SubtleButton from '../components/primitives/Button'
import Typography from '../components/primitives/Typography'
import Divider from '../components/primitives/Divider'
import Checkbox from '../components/primitives/Checkbox'
import SteppedSlider from '../components/primitives/Slider'
import Notice from '../components/primitives/Notice'
import NavStack from '../components/NavStack/NavStack'
import NavStackView from '../components/NavStack/NavStackView'

import { PALETTE_DISPLAY_NAMES } from '../palettes'

import { FaChevronRight } from 'react-icons/fa6'

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

const PLAYBACK_RATE_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
const THRESHOLD_STEPS = Array.from({ length: 256 }, (_, i) => i)

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
  palettes,
  currentPalette,
  colors,
  strategyType,
  clarity,
  showPopulation,
  populationPercentages,
  onPaletteChange,
  onStrategyChange,
  onColorChange,
  onRemoveColor,
  onSwapColor,
  onAddColor,
  onClarityChange,
  fps,
  onFpsChange,
  onShowPopulationChange,
  videoFound,
  soundEnabled,
  onSoundChange,
  playbackRate,
  onPlaybackRateChange,
  threshold,
  onThresholdChange,
  onPanelStateChange,
  thumbnail,
  className = '',
}) {
  const { panelRef } = useTheme()
  const [showPalettePicker, setShowPalettePicker] = useState(false)
  const [panelState, setPanelState] = useState(
    /** @type {'open' | 'hidden'} */ ('open')
  )
  const [isClosing, setIsClosing] = useState(false)
  const panelStateRef = useRef(panelState)
  const idleTimerRef = useRef(
    /** @type {ReturnType<typeof setTimeout> | null} */ (null)
  )
  const paletteLinkRef = useRef(/** @type {HTMLButtonElement | null} */ (null))
  const prevShowPalettePickerRef = useRef(false)

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

  const revealPanel = useCallback(() => {
    goTo('open')
    requestAnimationFrame(() => paletteLinkRef.current?.focus())
  }, [goTo])

  const hidePanel = useCallback(() => goTo('hidden'), [goTo])

  useKeyboardShortcut({
    id: 'toggle-palette-picker',
    keys: ['p'],
    label: 'Open palette picker',
    handler: () => setShowPalettePicker((prev) => !prev),
  })

  useKeyboardShortcut({
    id: 'toggle-show-population',
    keys: ['s'],
    label: 'Toggle target percentages',
    handler: () => onShowPopulationChange(!showPopulation),
  })

  // Only active while the picker is open, so the second Escape press (once
  // this is unregistered) falls through to KeyboardControls' default blur —
  // which is what actually closes the panel, via the focus-out rule below.
  useKeyboardShortcut({
    id: 'close-palette-picker',
    keys: ['Escape'],
    label: 'Close palette picker',
    enabled: showPalettePicker,
    handler: () => setShowPalettePicker(false),
  })

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

      const focusable = panelRef.current?.querySelector(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
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

  useEffect(() => {
    if (showPalettePicker && !prevShowPalettePickerRef.current) {
      requestAnimationFrame(() => {
        const checked = panelRef.current?.querySelector(
          'input[type="radio"]:checked'
        )
        if (checked instanceof HTMLElement) checked.focus()
      })
    } else if (!showPalettePicker && prevShowPalettePickerRef.current) {
      requestAnimationFrame(() => paletteLinkRef.current?.focus())
    }
    prevShowPalettePickerRef.current = showPalettePicker
  }, [showPalettePicker, panelRef])

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

  function handlePalettePickerLink() {
    setShowPalettePicker(true)
  }

  const handlePanelKeyDown = (e) => {
    if (e.key !== 'Tab' || panelState !== 'open') return
    const container = e.currentTarget
    const focusable = Array.from(
      container.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
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
          <NavStack activeView={showPalettePicker ? 'palette-picker' : 'main'}>
            <NavStackView id="main">
              <div className="flex flex-col">
                <div className="flex flex-col">
                  <SubtleButton
                    ref={paletteLinkRef}
                    onClick={handlePalettePickerLink}
                  >
                    <div className="gap-0 text-left">
                      <Typography as="p">Color palette</Typography>
                      <Typography intent="weak" as="p">
                        {PALETTE_DISPLAY_NAMES[currentPalette]}
                      </Typography>
                    </div>
                    <FaChevronRight size="1.5em" />
                  </SubtleButton>
                  <ColorList
                    colors={colors}
                    onColorChange={onColorChange}
                    onRemoveColor={onRemoveColor}
                    onSwapColor={onSwapColor}
                    onAddColor={onAddColor}
                    showPopulation={showPopulation}
                    populationPercentages={populationPercentages}
                  />
                </div>

                <div className="px-5 pt-7">
                  <AdvancedControls
                    currentStrategy={strategyType}
                    onStrategyChange={onStrategyChange}
                    clarity={clarity}
                    fps={fps}
                    onClarityChange={onClarityChange}
                    onFpsChange={onFpsChange}
                  />
                </div>

                <Divider className="" />

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

                      <SteppedSlider
                        label="Contrast"
                        value={thresholdStepIndex}
                        displayValue={THRESHOLD_STEPS[thresholdStepIndex]}
                        steps={THRESHOLD_STEPS}
                        onChange={(e) =>
                          onThresholdChange(
                            THRESHOLD_STEPS[parseInt(e.target.value)]
                          )
                        }
                      />

                      {thumbnail}
                    </>
                  ) : (
                    <Notice title="Movie not found">
                      Place a video at{' '}
                      <code>public/cinema/media/metropolis.mp4</code> and
                      reload.
                    </Notice>
                  )}
                </div>
              </div>
            </NavStackView>

            <NavStackView id="palette-picker">
              <PalettePicker
                palettes={palettes}
                currentPalette={currentPalette}
                onPaletteChange={onPaletteChange}
                onBack={() => setShowPalettePicker(false)}
              />
            </NavStackView>
          </NavStack>
        </div>
      </div>
    </div>
  )
}
