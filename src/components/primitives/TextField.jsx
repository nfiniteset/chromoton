import { useState } from 'react'
import { cn } from '../../lib/utils'
import Typography from './Typography'

/**
 * A labelled single-line text input that commits on Enter or blur rather
 * than on every keystroke, and reverts on Escape.
 *
 * The deferred commit is the point of it. The panel's other primitives all
 * drive cheap, idempotent setters — a slider can fire on every tick because
 * the worst case is a wasted repaint. A field whose value is a connection
 * URL cannot: committing per keystroke would try to open (and fail, and
 * schedule a reconnect for) a socket at every prefix of what someone is
 * typing.
 */
export default function TextField({
  label,
  value,
  onCommit,
  placeholder = '',
  className = '',
}) {
  const [draft, setDraft] = useState(value)
  const [prevValue, setPrevValue] = useState(value)

  // Adopt an externally changed value without a setState-in-effect render
  // cascade — same pattern as CommandMenu's query reset.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (value !== prevValue) {
    setPrevValue(value)
    setDraft(value)
  }

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed === value) return
    onCommit(trimmed)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setDraft(value)
      e.currentTarget.blur()
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Typography as="label" intent="strong">
        {label}
      </Typography>
      <input
        type="text"
        value={draft}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-full rounded-md bg-white/5 px-2 py-1.5 text-[11px] outline-none"
        style={{
          borderColor: 'var(--ct-border-hover)',
          borderWidth: '1px',
          borderStyle: 'solid',
          color: 'var(--ct-text)',
          transition:
            'color var(--duration-color) ease-out, border-color var(--duration-color) ease-out',
        }}
      />
    </div>
  )
}
