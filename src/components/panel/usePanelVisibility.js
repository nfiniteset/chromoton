import { useState, useRef, useCallback, useEffect } from 'react'
import {
  OPENNESS,
  HOT_ZONE_WIDTH,
  IDLE_HIDE_DELAY,
  FOCUSABLE_SELECTOR,
} from './constants'

/**
 * Shared open/peek/hidden state machine for a floating side panel: ambient
 * hover reveal (hot-zone + peek), click-outside toggle, idle-hide, and
 * keyboard-driven focus handling (focus-in opens, focus-out hides, Tab
 * cycles through the panel's own controls). Used by both ControlPanel and
 * CinemaControlPanel so their visibility behavior can't drift apart.
 *
 * @param {object} options
 * @param {import('react').RefObject<HTMLElement | null>} options.panelRef - Root
 *   element of the panel itself (attach this to the panel's outer div).
 * @param {boolean} [options.pinned] - When true, blocks every hide trigger
 *   and forces the panel open (e.g. a "keep visible" setting).
 * @param {(state: 'open' | 'peek' | 'hidden') => void} [options.onStateChange] -
 *   Reports state changes up, for sibling UI that needs to stay in sync
 *   (e.g. cinema's Scrubber fading with the panel).
 * @param {import('react').RefObject<HTMLElement | null>} [options.initialFocusRef] -
 *   Specific control to focus when the panel is explicitly revealed;
 *   defaults to the panel's first focusable element.
 * @param {string} [options.uiSelector] - CSS selector matching sibling
 *   elements (outside the panel) that should count as part of the same UI:
 *   hovering or focusing them won't hide the panel, and they're included in
 *   the Tab cycle alongside the panel's own controls.
 */
export function usePanelVisibility({
  panelRef,
  pinned = false,
  onStateChange,
  initialFocusRef,
  uiSelector,
}) {
  const [panelState, setPanelState] = useState(
    /** @type {'open' | 'peek' | 'hidden'} */ ('open')
  )
  const [isClosing, setIsClosing] = useState(false)
  const panelStateRef = useRef(panelState)
  const idleTimerRef = useRef(
    /** @type {ReturnType<typeof setTimeout> | null} */ (null)
  )

  // Single choke point for every hide trigger (idle timeout, click on the
  // sim, focus loss) — refusing here (when pinned) covers all of them at
  // once rather than guarding each call site individually.
  const goTo = useCallback(
    (nextState) => {
      if (nextState === panelStateRef.current) return
      if (nextState === 'hidden' && pinned) return
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
    [panelRef, pinned]
  )

  // Anything inside the panel, or inside a uiSelector-matched sibling (e.g.
  // cinema's Scrubber), counts as "ours" for focus purposes — used both to
  // decide whether losing focus should hide the panel, and to build the
  // combined Tab loop below.
  const isOwned = useCallback(
    (el) =>
      el instanceof Node &&
      (!!panelRef.current?.contains(el) ||
        (!!uiSelector && el instanceof Element && !!el.closest(uiSelector))),
    [panelRef, uiSelector]
  )

  // Combined focus order across the panel and any uiSelector-matched
  // siblings, in DOM order. Used to cycle Tab across both regions instead of
  // trapping it inside the panel alone.
  const getOwnedFocusable = useCallback(() => {
    return /** @type {HTMLElement[]} */ (
      Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) =>
          (panelRef.current?.contains(el) ||
            (uiSelector && el.closest(uiSelector))) &&
          !el.closest('[inert]')
      )
    )
  }, [panelRef, uiSelector])

  // Explicit reveal (click-outside, keypress) — fully opens and focuses in,
  // unlike the ambient hover reveal which only opens without stealing focus.
  const revealPanel = useCallback(() => {
    goTo('open')
    requestAnimationFrame(() => {
      const focusable =
        initialFocusRef?.current ??
        panelRef.current?.querySelector(FOCUSABLE_SELECTOR)
      if (focusable instanceof HTMLElement) focusable.focus()
    })
  }, [goTo, panelRef, initialFocusRef])

  const hidePanel = useCallback(() => goTo('hidden'), [goTo])

  // Turning pinned on should make the panel visible right away, not just
  // block the next hide — otherwise pinning while already hidden would
  // silently do nothing until some other trigger happened to reveal it.
  useEffect(() => {
    if (pinned) goTo('open')
  }, [pinned, goTo])

  // Keyboard-driven panel visibility: focus entering the panel opens it and
  // holds it open (see the idle-hide guard below); focus leaving it — via
  // Escape's blur fallback, or Tabbing past the last control — closes it
  // immediately rather than waiting on the mouse-idle timer, since a
  // keyboard user isn't moving the mouse at all. Focus moving onto a
  // uiSelector-matched sibling is still "ours" and doesn't count as leaving.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const handleFocusIn = () => goTo('open')

    const handleFocusOut = (e) => {
      if (isOwned(e.relatedTarget)) return
      goTo('hidden')
    }

    panel.addEventListener('focusin', handleFocusIn)
    panel.addEventListener('focusout', handleFocusOut)
    return () => {
      panel.removeEventListener('focusin', handleFocusIn)
      panel.removeEventListener('focusout', handleFocusOut)
    }
  }, [panelRef, goTo, isOwned])

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

  // Cycles Tab/Shift+Tab across the panel and any uiSelector-matched
  // siblings as one combined loop, rather than trapping focus inside the
  // panel alone. Lives at the document level, not on the panel's own
  // onKeyDown, since a keydown while focus is on a sibling element never
  // bubbles through the panel.
  useEffect(() => {
    const handleTabCycle = (e) => {
      if (e.key !== 'Tab' || panelState !== 'open') return
      if (!isOwned(document.activeElement)) return

      const focusable = getOwnedFocusable()
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

    document.addEventListener('keydown', handleTabCycle)
    return () => document.removeEventListener('keydown', handleTabCycle)
  }, [panelState, isOwned, getOwnedFocusable])

  // Hide the system cursor while the panel is fully hidden; restore it as
  // soon as the panel peeks or opens.
  useEffect(() => {
    document.body.style.cursor = panelState === 'hidden' ? 'none' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [panelState])

  useEffect(() => {
    onStateChange?.(panelState)
  }, [panelState, onStateChange])

  // Click anywhere outside the panel (and outside any uiSelector-matched
  // sibling) toggles it: closes it while open, reveals it otherwise.
  //
  // Listens on mousedown rather than click. If a panel control currently
  // has focus, clicking outside the panel blurs it as the browser's own
  // mousedown default action — which fires the focus-out handler above and
  // hides the panel *before* a 'click' listener would ever run. A 'click'
  // handler would then read the already-hidden panelStateRef and reveal
  // instead of hide, producing a hide-then-immediately-reopen wiggle
  // instead of closing. Acting on mousedown runs first, so this handler's
  // own hidePanel() gets to blur the control (and settle the state) itself.
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (e.button !== 0) return
      if (panelRef.current?.contains(e.target)) return
      if (uiSelector && e.target.closest(uiSelector)) return
      if (panelStateRef.current === 'open') {
        hidePanel()
      } else {
        revealPanel()
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [panelRef, uiSelector, hidePanel, revealPanel])

  // Ambient hover behavior: idle (mouse off panel/UI, still for 3s) hides
  // the panel; any movement while hidden peeks it onscreen; moving into the
  // right hot zone, or hovering the panel or a uiSelector-matched sibling,
  // opens it fully.
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
        // A keyboard user tabbing through the panel or a uiSelector sibling
        // isn't moving the mouse — don't let this ambient timer yank focus
        // out from under them.
        if (isOwned(document.activeElement)) return
        goTo('hidden')
      }, IDLE_HIDE_DELAY)
    }

    const handleMouseMove = (e) => {
      const overPanel = panelRef.current?.contains(e.target)
      const overUI = isOwned(e.target)
      const inHotZone = window.innerWidth - e.clientX <= HOT_ZONE_WIDTH

      if (overPanel || overUI || inHotZone) {
        clearIdleTimer()
        goTo('open')
        return
      }

      if (panelStateRef.current === 'hidden') {
        goTo('peek')
      }
      scheduleIdleHide()
    }

    document.addEventListener('mousemove', handleMouseMove)
    scheduleIdleHide()

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      clearIdleTimer()
    }
  }, [panelRef, goTo, isOwned])

  return { panelState, isClosing, revealPanel, hidePanel }
}
