import { useMemo, useRef, useState } from 'react'
import { cn } from '../lib/utils'
import {
  useKeyboardShortcut,
  useKeyboardShortcutsList,
} from '../hooks/useKeyboardShortcut'

function isMacPlatform() {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent)
}

const KEY_LABELS = {
  ' ': 'Space',
  arrowleft: '←',
  arrowright: '→',
  arrowup: '↑',
  arrowdown: '↓',
  escape: 'Esc',
}

function formatCombo(combo) {
  const mac = isMacPlatform()
  const parts = combo.split('+')
  const base = parts.pop()
  const modLabels = parts.map((mod) => {
    switch (mod.toLowerCase()) {
      case 'mod':
        return mac ? '⌘' : 'Ctrl'
      case 'shift':
        return mac ? '⇧' : 'Shift'
      case 'alt':
        return mac ? '⌥' : 'Alt'
      case 'ctrl':
        return 'Ctrl'
      case 'meta':
        return '⌘'
      default:
        return mod
    }
  })
  const baseLabel =
    KEY_LABELS[base.toLowerCase()] ??
    (base.length === 1 ? base.toUpperCase() : base)
  return [...modLabels, baseLabel].join(mac ? '' : '+')
}

// Own entries excluded from the results list — invoking "open command menu"
// from inside the command menu isn't a useful action.
const HIDDEN_IDS = new Set(['open-command-menu', 'close-command-menu'])

export default function CommandMenu() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [prevQuery, setPrevQuery] = useState(query)
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const shortcuts = useKeyboardShortcutsList()

  // Reset the selection whenever the query changes, without a setState-in-
  // effect render cascade (see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  if (query !== prevQuery) {
    setPrevQuery(query)
    setActiveIndex(0)
  }

  const closeMenu = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  useKeyboardShortcut({
    id: 'open-command-menu',
    keys: ['mod+k', '/'],
    label: 'Open command menu',
    handler: (e) => {
      e.preventDefault()
      setOpen(true)
      requestAnimationFrame(() => inputRef.current?.focus())
    },
  })

  useKeyboardShortcut({
    id: 'close-command-menu',
    keys: ['Escape'],
    label: 'Close command menu',
    enabled: open,
    handler: closeMenu,
  })

  const results = useMemo(() => {
    const visible = shortcuts.filter((s) => !HIDDEN_IDS.has(s.id))
    const q = query.trim().toLowerCase()
    if (!q) return visible
    return visible.filter((s) => s.label.toLowerCase().includes(q))
  }, [shortcuts, query])

  const runEntry = (entry) => {
    closeMenu()
    entry.handler(new KeyboardEvent('keydown'))
  }

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const entry = results[activeIndex]
      if (entry) runEntry(entry)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeMenu()
      }}
    >
      <div
        className="w-[360px] overflow-hidden rounded-2xl bg-white/8 text-xs tracking-wider uppercase shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl backdrop-saturate-[180%]"
        style={{ color: 'var(--ct-text)' }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Type a command…"
          className="command-menu-input w-full bg-transparent px-5 py-3 text-xs tracking-wider uppercase"
        />

        {/* Fixed dark divider rather than the shared Divider primitive — that
            one uses the live contrast-adaptive --ct-border color, tuned for
            sitting over the anchored control panel. This menu floats over
            whatever's behind it, so a translucent-white line washes out
            against bright backdrops; a solid dark one reads consistently. */}
        <hr
          className="h-px border-none"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
        />

        <div className="max-h-[300px] overflow-y-auto pb-2">
          {results.length === 0 && (
            <div className="px-5 py-3" style={{ color: 'var(--ct-text-weak)' }}>
              No matching commands
            </div>
          )}

          {results.map((entry, index) => (
            <button
              key={entry.id}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => runEntry(entry)}
              className={cn(
                'subtle-button flex w-full items-center justify-between px-5 py-3 text-left',
                index === activeIndex && 'subtle-button--active'
              )}
            >
              <span>{entry.label}</span>
              <span
                style={{
                  color:
                    index === activeIndex
                      ? 'var(--ct-text-active)'
                      : 'var(--ct-text-weak)',
                }}
              >
                {entry.keys.map(formatCombo).join(' / ')}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
