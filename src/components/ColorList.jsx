import ColorSwatch from './ColorSwatch'
import { useTheme } from '../contexts/ThemeContext'

export default function ColorList({
  colors,
  onColorChange,
  onRemoveColor,
  onAddColor,
  showPopulation,
  populationPercentages,
}) {
  const { contrastColors } = useTheme()
  const handleColorChange = (index, hex) => {
    if (!hex || hex.length !== 7) return

    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)

    onColorChange(index, r, g, b)
  }

  return (
    <div className="flex flex-col gap-2">
      {colors.map((color, index) => (
        <ColorSwatch
          key={index}
          color={color}
          onColorChange={(hex) => handleColorChange(index, hex)}
          onRemove={() => onRemoveColor(index)}
          canRemove={colors.length > 1}
          percentage={
            showPopulation && populationPercentages[index] !== undefined
              ? populationPercentages[index]
              : null
          }
        />
      ))}
      <button
        onClick={onAddColor}
        disabled={colors.length >= 5}
        className="mt-0 w-full rounded-sm bg-white/10 py-1.5 text-[11px] tracking-wider uppercase hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          color: contrastColors?.textColor,
          borderColor: contrastColors?.borderColorHover,
          borderWidth: '1px',
          borderStyle: 'solid',
          transition:
            'color 300ms ease-out, border-color 300ms ease-out, background-color 300ms ease-out, opacity 300ms ease-out',
        }}
      >
        + Add Color
      </button>
    </div>
  )
}
