import ColorSwatch from './ColorSwatch'
import SubtleButton from './SubtleButton'
import { useTheme } from '../contexts/ThemeContext'

import { BsPlus } from "react-icons/bs";

export default function ColorList({
  colors,
  onColorChange,
  onRemoveColor,
  onAddColor,
  onSwapColor,
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
    <div className="flex flex-col">
      {colors.map((color, index) => (
        <ColorSwatch
          key={index}
          color={color}
          onColorChange={(hex) => handleColorChange(index, hex)}
          onRemove={() => onRemoveColor(index)}
          onSwap={onSwapColor ? () => onSwapColor(index) : null}
          canRemove={colors.length > 1}
          percentage={
            showPopulation && populationPercentages[index] !== undefined
              ? populationPercentages[index]
              : null
          }
        />
      ))}
      {colors.length <= 4 ? (<SubtleButton
        onClick={onAddColor}
        className="border-t-1 flex justify-center items-center"
      >
        <BsPlus size="1.5em" />
      </SubtleButton>) : undefined}
    </div>
  )
}
