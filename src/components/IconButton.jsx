import { cn } from '../lib/utils'

export default function IconButton({
  onClick,
  children,
  className = '',
  disabled = false,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'icon-button flex h-full grow cursor-pointer items-center justify-center',
        className
      )}
      style={{
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}
