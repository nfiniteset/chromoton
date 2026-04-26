import { useTheme } from '../contexts/ThemeContext'

export default function ColorSwatch({
  color,
  selected = false,
  onClick,
  placeholder = false,
  text,
  className
}) {
  const { contrastColors, getThemeForColor } = useTheme()

  if (placeholder || !color) {
    return (
      <div
        className="h-6 w-6 flex-shrink-0 rounded-sm"
        style={{
          border: `1px dashed ${contrastColors?.textColor}`,
          transition: 'border-color 300ms ease-out',
        }}
      />
    )
  }

  const theme = getThemeForColor(color)

  return (
    <div
      onClick={onClick}
      className={`relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-sm border ${onClick ? 'cursor-pointer' : ''} {className}`}
      style={{
        backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
        outline: selected
          ? `2px solid ${contrastColors.textColor}`
          : `2px solid transparent`,
        borderColor: contrastColors.borderColor,
        outlineOffset: '2px',
        transition: 'background-color 300ms ease-out, outline-color 150ms ease-out, border-color 300ms ease-out',
      }}
    >
      {text && (
        <span
          className="absolute inset-0 flex items-center justify-center text-xs leading-none font-medium"
          style={{ color: theme.textColor }}
        >
          {text}
        </span>
      )}
    </div>
  )
}
