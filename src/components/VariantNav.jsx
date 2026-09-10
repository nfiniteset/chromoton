import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'
import { useCanvasContrast } from '../hooks/useCanvasContrast'
import { VARIANTS } from '../cinema/variants'
import { FaChevronDown } from 'react-icons/fa6'

function pathDepth(path) {
  return path.split('/').filter(Boolean).length
}

/**
 * Top-left title button that opens a menu of every variation (see
 * src/cinema/variants.js) so you can jump between them without memorizing
 * URLs. Each entry is a plain link to another page — variations are
 * separate builds, not client-side routes, so this is a real navigation.
 *
 * Rendered by the main app as well as by every cinema variation, which sit
 * at different depths (root vs. cinema/<name>/). Since the build is
 * deployed with a relative base, links can't be root-absolute — see
 * `hrefFor` below.
 *
 * Sits over a different part of the canvas than the settings panel
 * (top-right) or Scrubber (bottom), so — same as Scrubber — it samples its
 * own contrast independently rather than inheriting the panel's global
 * `--ct-*` vars, scoped to its own root element.
 *
 * `data-cinema-ui` marks it as part of the same hover/focus/hide-prevention
 * region as the rest of the floating UI (see the UI_SELECTOR in
 * CinemaControlPanel and ControlPanel — the attribute name predates the
 * main app rendering this too), and `hidden` should mirror the settings
 * panel's own state
 * (`panelState === 'hidden'`) so it fades with the rest of the UI instead
 * of lingering over the sim.
 */
export default function VariantNav({
  current,
  hidden = false,
  className = '',
}) {
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [open, setOpen] = useState(false)
  const contrastColors = useCanvasContrast(rootRef)
  const currentEntry = VARIANTS.find((v) => v.id === current)
  // Climb out of the current page's own folder, then descend into the
  // target's — the same link works from the root-level main app and from a
  // nested cinema variation without either knowing the deployed base path.
  const depth = currentEntry ? pathDepth(currentEntry.path) : 0
  // The main app's own path is '', so its self-link needs an explicit './'.
  const hrefFor = (variant) => '../'.repeat(depth) + variant.path || './'

  // Rendered rather than reset via effect — `hidden` just hides the menu
  // along with the rest of the nav; `open` itself is left alone so it
  // doesn't fight a concurrent render (see react-hooks/set-state-in-effect).
  const menuOpen = open && !hidden

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      data-cinema-ui="variant-nav"
      className={cn(
        'fixed top-5 left-5 z-[100] text-xs tracking-wider uppercase',
        className
      )}
      style={{
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        transition: 'opacity 300ms ease-out',
        '--ct-text': contrastColors.text,
        '--ct-text-weak': contrastColors.textWeak,
        '--ct-border': contrastColors.border,
        '--ct-bg-hover': contrastColors.backgroundHover,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center gap-1.5 rounded-2xl bg-white/8 px-3 py-2 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl backdrop-saturate-[180%]"
        style={{ color: 'var(--ct-text)' }}
      >
        <span>{currentEntry?.label ?? 'Chromoton Cinema'}</span>
        <FaChevronDown
          size="0.7em"
          style={{
            opacity: 0.6,
            transform: menuOpen ? 'rotate(180deg)' : undefined,
            transition: 'transform 150ms ease-out',
          }}
        />
      </button>

      {menuOpen && (
        <div className="absolute top-full left-0 mt-2 flex max-h-[60vh] min-w-[200px] flex-col gap-1 overflow-y-auto rounded-2xl bg-white/8 p-1 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl backdrop-saturate-[180%]">
          {VARIANTS.map((v) => {
            const isCurrent = v.id === current
            return (
              <a
                key={v.id}
                href={hrefFor(v)}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 no-underline hover:bg-[var(--ct-bg-hover)]"
                style={{
                  color: isCurrent ? 'var(--ct-text)' : 'var(--ct-text-weak)',
                  pointerEvents: isCurrent ? 'none' : 'auto',
                }}
              >
                {v.label}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
