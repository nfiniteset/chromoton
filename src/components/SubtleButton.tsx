import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

interface SubtleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  children: ReactNode
}

const SubtleButton = forwardRef<HTMLButtonElement, SubtleButtonProps>(
  function SubtleButton(
    { onClick, children, className, active = false, style, ...props },
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
          '--bg-normal': 'transparent',
          '--bg-hover': contrastColors.backgroundHover,
          '--bg-active': contrastColors.backgroundActive,
          '--bg-active-hover': contrastColors.backgroundActiveHover,
          '--border-normal': contrastColors.border,
          '--border-active': contrastColors.borderHover,
          '--text-normal': contrastColors.text,
          '--text-active': contrastColors.textActive,
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
  }
)

export default SubtleButton
