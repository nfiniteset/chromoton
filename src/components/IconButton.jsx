import { useTheme } from '../contexts/ThemeContext'

export default function IconButton({
  onClick,
  children,
  className = '',
  theme,
  disabled = false,
}) {
  const { contrastColors } = useTheme()

  // If a specific theme is provided, use it
  // Otherwise, use the default contrast colors from the canvas
  const bgHover = theme?.backgroundHover || contrastColors?.backgroundHover
  const iconColor = theme?.iconColor

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`icon-button flex h-full w-full cursor-pointer items-center justify-center ${className}`}
      style={{
        '--bg-hover': bgHover,
        backgroundColor: 'transparent',
        color: iconColor || 'inherit',
        transition: 'background-color 300ms ease-out, color 300ms ease-out',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}
