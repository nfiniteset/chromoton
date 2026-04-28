import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

export default function ColorSwatch({
  color = /** @type {import('../models/colorModel').Color | undefined} */ (
    undefined
  ),
  selected = false,
  onClick = /** @type {(() => void) | undefined} */ (undefined),
  placeholder = false,
  text = /** @type {string | undefined} */ (undefined),
  className = '',
}) {
  const { getThemeForColor } = useTheme()

  if (placeholder || !color) {
    return (
      <div
        className="h-6 w-6 flex-shrink-0 rounded-sm"
        style={{
          border: '1px dashed var(--ct-text)',
          transition: 'border-color 300ms ease-out',
        }}
      />
    )
  }

  const theme = getThemeForColor(color)

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-sm border',
        onClick && 'cursor-pointer',
        className
      )}
      style={{
        backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
        outline: selected
          ? '2px solid var(--ct-text)'
          : '2px solid transparent',
        borderColor: 'var(--ct-border)',
        outlineOffset: '2px',
        transition:
          'background-color 300ms ease-out, outline-color 150ms ease-out, border-color 300ms ease-out',
      }}
    >
      {text && (
        <span
          className="absolute inset-0 flex items-center justify-center text-xs leading-none font-medium"
          style={{ color: theme.icon, transition: 'color 300ms ease-out' }}
        >
          {text}
        </span>
      )}
    </div>
  )
}
