import { useState, useRef } from 'react'
import { cn } from '../lib/utils'
import ColorSwatch from './ColorSwatch'
import IconButton from './IconButton'
import { useTheme } from '../contexts/ThemeContext'
import { MAX_COLORS } from '../models/colorModel'

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
  onOpenAdvanced,
  showPopulation,
  populationPercentages,
  advancedMode = false,
  className,
}) {
  const [pickerIndex, setPickerIndex] = useState(null)
  const colorInputRef = useRef(null)
  const { contrastColors } = useTheme()

  const handleColorChange = (hex) => {
    if (!hex || hex.length !== 7 || pickerIndex === null) return
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    onColorChange(pickerIndex, r, g, b)
  }

  const handleRemoveAt = (index) => {
    onRemoveColor(index)
    setPickerIndex(null)
  }

  const openColorPickerFor = (index) => {
    setPickerIndex(index)
    requestAnimationFrame(() => colorInputRef.current?.click())
  }

  if (advancedMode) {
    return (
      <div
        className={cn('flex flex-col', className)}
        style={{ borderTop: `1px solid ${contrastColors?.borderColor}`, transition: 'border-color 300ms ease-out' }}
      >
        <div className="relative">
          <input
            ref={colorInputRef}
            type="color"
            value={pickerIndex !== null && colors[pickerIndex] ? rgbToHex(colors[pickerIndex]) : '#000000'}
            onChange={(e) => handleColorChange(e.target.value)}
            className="pointer-events-none absolute opacity-0"
            style={{ width: '1px', height: '1px' }}
          />
        </div>

        {colors.map((color, index) => (
          <div
            key={index}
            className="flex items-center pl-5 pr-2 border-b-1"
            style={{ 
              height: '48px', 
              borderColor: contrastColors?.borderColor, 
              transition: 'border-color 300ms ease-out'
            }}
          >
            <ColorSwatch
              color={color}
              className="mr-2 grow-2"
              text={
                showPopulation && populationPercentages?.[index] != null
                  ? `${Math.round(populationPercentages[index])}%`
                  : undefined
              }
            />

            <IconButton onClick={() => openColorPickerFor(index)}>
              <FaEyeDropper size="1em" />
            </IconButton>

            <IconButton onClick={() => onSwapColor && onSwapColor(index)}>
              <FaArrowRotateRight size="1em" />
            </IconButton>

            <IconButton
              disabled={colors.length <= 1}
              onClick={() => handleRemoveAt(index)}
            >
              <FaXmark size="1.2em" />
            </IconButton>
          </div>
        ))}

        {colors.length < MAX_COLORS && (
          <button
            onClick={onAddColor}
            className="flex h-12 w-full cursor-pointer items-center gap-2 px-5 border-b-1"
            style={{
              color: contrastColors?.textColor,
              borderColor: contrastColors?.borderColor,
              transition: 'color 300ms ease-out'
            }}
          >
            <FaPlus size="1em" />
            <span className="text-xs tracking-wider uppercase">Add target color</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div
        className="flex flex-wrap items-center gap-1.5 px-5 py-3"
        style={{ borderTop: `1px solid ${contrastColors?.borderColor}`, transition: 'border-color 300ms ease-out' }}
      >
        {colors.map((color, index) => (
          <ColorSwatch
            key={index}
            color={color}
            onClick={onOpenAdvanced}
          />
        ))}

      </div>
    </div>
  )
}
