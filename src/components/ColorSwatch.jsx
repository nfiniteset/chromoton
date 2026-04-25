import { useTheme } from '../contexts/ThemeContext'
import { BsEyedropper, BsArrowClockwise, BsX } from 'react-icons/bs'
import IconButton from './IconButton'

export default function ColorSwatch({
  color,
  onColorChange,
  onRemove,
  onSwap,
  canRemove,
  percentage,
}) {
  const { contrastColors, getThemeForColor } = useTheme()

  const rgbToHex = (r, g, b) => {
    const hexValues = [r, g, b].map((v) => v.toString(16).padStart(2, '0'))
    return '#' + hexValues.join('')
  }

  const handleColorChange = (e) => {
    const hex = e.target.value
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    onColorChange({ r, g, b })
  }

  // Get theme colors for this specific color
  const theme = getThemeForColor(color)
  const textColor = theme.textColor

  return (
    <div
      className="group relative flex w-full items-center overflow-hidden border-t first:border-t-0"
      style={{
        borderTopColor: contrastColors?.borderColor,
        transition: 'border-color 300ms ease-out',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `rgb(${color.r}, ${color.g}, ${color.b})`,
          transition: 'background 300ms ease-out',
        }}
      />

      {percentage !== null && (
        <div
          className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center text-xs font-semibold tracking-wide transition-opacity group-hover:opacity-0"
          style={{ color: textColor }}
        >
          {percentage.toFixed(1)}%
        </div>
      )}

      <div className="relative z-[10] flex h-12 w-full items-fill gap-0 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="relative flex-1">
          <label htmlFor={`color-picker-${color.r}-${color.g}-${color.b}`} className="flex h-full w-full">
            <IconButton color={color}>
              <BsEyedropper size="1.2em" />
            </IconButton>
          </label>
          <input
            id={`color-picker-${color.r}-${color.g}-${color.b}`}
            type="color"
            value={rgbToHex(color.r, color.g, color.b)}
            onChange={handleColorChange}
            className="absolute inset-0 h-0 w-0 cursor-pointer border-none opacity-0"
          />
        </div>

        <div className="flex-1">
          <IconButton color={color} onClick={onSwap}>
            <BsArrowClockwise size="1.3em" />
          </IconButton>
        </div>

        <div className="flex-1">
          <IconButton color={color} disabled={!canRemove} onClick={onRemove}>
            <BsX size="1.5em" />
          </IconButton>
        </div>
      </div>
    </div>
  )
}
