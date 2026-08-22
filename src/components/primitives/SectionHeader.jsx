import { cn } from '../../lib/utils'
import Typography from './Typography'

// A section label — same size as the rest of the panel's text (the panel
// itself sets text-xs/uppercase/tracking-wider), just a bit more prominent
// via weight and wider tracking, to mark the start of a group of controls
// without introducing a whole new type scale.
export default function SectionHeader({ children, className = '' }) {
  return (
    <Typography
      as="p"
      intent="strong"
      className={cn('font-semibold tracking-widest', className)}
    >
      {children}
    </Typography>
  )
}
