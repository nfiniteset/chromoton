import { useTheme } from '../contexts/ThemeContext'

export default function ColorSwatch({
  color,
  onColorChange,
  onRemove,
  canRemove,
  percentage,
}) {
  const { contrastColors } = useTheme()
  const rgbToHex = (r, g, b) => {
    const hexValues = [r, g, b].map((v) => v.toString(16).padStart(2, '0'))
    const hexString = '#' + hexValues.join('')
    return hexString
  }

  const handleColorChange = (e) => {
    console.log('Color picker changed:', e.target.value)
    onColorChange(e.target.value)
  }

  // Calculate luminance to determine text color
  const getLuminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map((val) => {
      const v = val / 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  const luminance = getLuminance(color.r, color.g, color.b)
  const textColor = luminance > 0.5 ? '#000000' : '#ffffff'

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-8 flex-1 overflow-hidden rounded-sm">
        <div
          className="pointer-events-none box-border h-full w-full rounded-sm"
          style={{
            background: `rgb(${color.r}, ${color.g}, ${color.b})`,
            borderColor: contrastColors?.borderColorHover,
            borderWidth: '1px',
            borderStyle: 'solid',
            transition:
              'background 300ms ease-out, border-color 300ms ease-out',
          }}
        />
        {percentage !== null && (
          <div
            className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center text-xs font-semibold tracking-wide"
            style={{ color: textColor }}
          >
            {percentage.toFixed(1)}%
          </div>
        )}
        <input
          type="color"
          value={rgbToHex(color.r, color.g, color.b)}
          onChange={handleColorChange}
          className="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer border-none p-0 opacity-0"
          style={{ minWidth: '100%', minHeight: '100%' }}
        />
      </div>
      {canRemove && (
        <button
          onClick={onRemove}
          className="h-8 w-8 cursor-pointer rounded-sm bg-white/10 p-0 text-lg leading-none hover:bg-white/15"
          style={{
            color: contrastColors?.textColor,
            borderColor: contrastColors?.borderColorHover,
            borderWidth: '1px',
            borderStyle: 'solid',
            transition:
              'color 300ms ease-out, border-color 300ms ease-out, background-color 300ms ease-out',
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
