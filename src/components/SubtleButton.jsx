import { useTheme } from '../contexts/ThemeContext'

export default function SubtleButton({
  onClick,
  children,
  className,
  active = false,
  style = {},
  ...props
}) {
  const { contrastColors } = useTheme()

  return (
    <button
      onClick={onClick}
      className={`subtle-button flex w-full cursor-pointer items-center justify-between px-5 py-4 text-[11px] tracking-wider uppercase ${active ? 'active' : ''} ${className}`}
      style={{
        // CSS custom properties for theme colors
        '--bg-normal': 'transparent',
        '--bg-hover': contrastColors.backgroundHover,
        '--bg-active': contrastColors.backgroundActive,
        '--bg-active-hover': contrastColors.backgroundActiveHover,
        '--border-normal': contrastColors.borderColor,
        '--border-active': contrastColors.borderColorHover,
        '--text-normal': contrastColors.textColor,
        '--text-active': contrastColors.textActive,

        // Apply colors using CSS variables
        backgroundColor: active ? 'var(--bg-active)' : 'var(--bg-normal)',
        borderColor: active ? 'var(--border-active)' : 'var(--border-normal)',
        color: active ? 'var(--text-active)' : 'var(--text-normal)',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
