import { forwardRef } from 'react'
import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

const SubtleButton = forwardRef(function SubtleButton(
  { onClick, children, className, active = false, style = {}, ...props },
  ref
) {
  const { contrastColors } = useTheme()

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        'subtle-button flex w-full cursor-pointer items-center justify-between px-5 py-4 text-[11px] tracking-wider uppercase',
        active && 'subtle-button--active',
        className
      )}
      style={{
        // CSS custom properties for theme colors
        '--bg-normal': 'transparent',
        '--bg-hover': contrastColors.backgroundHover,
        '--bg-active': contrastColors.backgroundActive,
        '--bg-active-hover': contrastColors.backgroundActiveHover,
        '--border-normal': contrastColors.border,
        '--border-active': contrastColors.borderHover,
        '--text-normal': contrastColors.text,
        '--text-active': contrastColors.textActive,

        // Apply colors using CSS variables
        border: active ? 'var(--border-active)' : 'var(--border-normal)',
        color: active ? 'var(--text-active)' : 'var(--text-normal)',
        transition:
          'background-color 300ms ease-out, border-color 300ms ease-out, color 300ms ease-out',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
})

export default SubtleButton
