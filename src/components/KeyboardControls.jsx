import { useEffect } from 'react'
import { dispatchKeyboardShortcut } from '../hooks/useKeyboardShortcut'

const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Single global keydown listener for the whole app. Every actual shortcut is
 * registered elsewhere via useKeyboardShortcut, next to the state it acts
 * on — this component only owns the listener, the shared "don't fire while
 * typing" guard, and the default Escape behavior (blur) when nothing else
 * claims it.
 */
export default function KeyboardControls() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target
      const isFormField =
        (target instanceof HTMLElement &&
          (FORM_TAGS.has(target.tagName) || target.isContentEditable)) ??
        false

      // Escape is exempt from the form-field guard — it's the universal
      // "cancel/dismiss" key and should work even while e.g. a palette
      // picker radio input has focus.
      if (isFormField && e.key !== 'Escape') return

      const handled = dispatchKeyboardShortcut(e)
      if (
        !handled &&
        e.key === 'Escape' &&
        document.activeElement instanceof HTMLElement
      ) {
        document.activeElement.blur()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return null
}
