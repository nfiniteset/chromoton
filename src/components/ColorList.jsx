import { useState, useRef } from 'react'
import ColorSwatch from './ColorSwatch'
import IconButton from './IconButton'
import { useTheme } from '../contexts/ThemeContext'

import {
  FaPlus,
  FaEyeDropper,
  FaArrowRotateRight,
  FaXmark,
} from 'react-icons/fa6'

const rgbToHex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

export default function ColorList({
  colors,
  onColorChange,
  onRemoveColor,
  onAddColor,
  onSwapColor,
  showPopulation,
  populationPercentages,
}) {
  const [selectedIndex, setSelectedIndex] = useState(null)
  const colorInputRef = useRef(null)
  const { contrastColors } = useTheme()

  const handleSwatchClick = (index) => {
    setSelectedIndex((prev) => (prev === index ? null : index))
  }

  const handleColorChange = (hex) => {
    if (!hex || hex.length !== 7 || selectedIndex === null) return
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    onColorChange(selectedIndex, r, g, b)
  }

  const handleRemove = () => {
    if (selectedIndex === null) return
    const newLength = colors.length - 1
    onRemoveColor(selectedIndex)
    setSelectedIndex(
      newLength === 0 ? null : Math.min(selectedIndex, newLength - 1)
    )
  }

  const isExpanded = selectedIndex !== null && selectedIndex < colors.length

  return (
    <div className="flex flex-col">
      <div
        className="flex flex-wrap items-center gap-1.5 px-5 py-3"
        style={{ borderTop: `1px solid ${contrastColors?.borderColor}` }}
      >
        {colors.map((color, index) => (
          <ColorSwatch
            key={index}
            color={color}
            selected={selectedIndex === index}
            onClick={() => handleSwatchClick(index)}
            text={
              showPopulation && populationPercentages?.[index] != null
                ? `${Math.round(populationPercentages[index])}%`
                : undefined
            }
          />
        ))}

        {colors.length <= 4 && (
          <button
            onClick={onAddColor}
            className="flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-sm"
            style={{ color: contrastColors?.textColor }}
          >
            <FaPlus size="1.2em" />
          </button>
        )}
      </div>

      {isExpanded && (
        <div
          className="flex h-12"
          style={{ borderTop: `1px solid ${contrastColors?.borderColor}` }}
        >
          <div className="relative flex-1">
            <IconButton onClick={() => colorInputRef.current?.click()}>
              <FaEyeDropper size="1.2em" />
            </IconButton>
            <input
              ref={colorInputRef}
              type="color"
              value={rgbToHex(colors[selectedIndex])}
              onChange={(e) => handleColorChange(e.target.value)}
              className="pointer-events-none absolute opacity-0"
              style={{ width: '1px', height: '1px' }}
            />
          </div>

          <div className="flex-1">
            <IconButton
              onClick={() => onSwapColor && onSwapColor(selectedIndex)}
            >
              <FaArrowRotateRight size="1.2em" />
            </IconButton>
          </div>

          <div className="flex-1">
            <IconButton disabled={colors.length <= 1} onClick={handleRemove}>
              <FaXmark size="1.5em" />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  )
}
