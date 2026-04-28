import { cn } from '../../lib/utils'

export default function Divider({ className }) {
  return (
    <hr
      className={cn('h-px border-none', className)}
      style={{
        backgroundColor: 'var(--ct-border)',
        transition: 'background-color 300ms ease-out',
      }}
    />
  )
}
