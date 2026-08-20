import { cn } from '../../lib/utils'
import Typography from './Typography'

/**
 * Themed message box for empty/error states (e.g. a missing local asset).
 * Uses the same adaptive `var(--ct-*)` theming as every other primitive —
 * no extra wiring needed as long as a ThemeProvider is mounted above it.
 */
export default function Notice({ title, children, className = '' }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-2xl border px-5 py-4',
        className
      )}
      style={{
        borderColor: 'var(--ct-border)',
        transition: 'border-color var(--duration-color) ease-out',
      }}
    >
      {title && (
        <Typography
          intent="strong"
          className="text-xs tracking-wider uppercase"
        >
          {title}
        </Typography>
      )}
      <Typography
        intent="weak"
        className="text-[11px] leading-relaxed break-words"
      >
        {children}
      </Typography>
    </div>
  )
}
