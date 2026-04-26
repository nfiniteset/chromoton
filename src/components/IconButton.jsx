import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

export default function IconButton({
  onClick,
  children,
  className,
  disabled = false,
}) {
  const { contrastColors } = useTheme()

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'icon-button flex h-full grow cursor-pointer items-center justify-center',
        className
      )}
      style={{
        '--bg-hover': contrastColors.backgroundHover,
        backgroundColor: 'transparent',
        color: contrastColors.textColor,
        transition: 'background-color 300ms ease-out, color 300ms ease-out',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}
