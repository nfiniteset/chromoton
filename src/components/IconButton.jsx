import { useTheme } from '../contexts/ThemeContext'

export default function IconButton({ onClick, children, className = '', color, disabled = false }) {
  const { contrastColors, getThemeForColor } = useTheme()

  // If a specific color is provided, get theme colors for that color
  // Otherwise, use the default contrast colors from the canvas
  const theme = color ? getThemeForColor(color) : null
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
