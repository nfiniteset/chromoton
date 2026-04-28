import { useState, useRef } from 'react'
import { cn } from '../lib/utils'
import ColorSwatch from './ColorSwatch'
import IconButton from './IconButton'
import SubtleButton from './SubtleButton'
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
  showPopulation,
  populationPercentages,
  className = '',
}) {
  const [pickerIndex, setPickerIndex] = useState(
    /** @type {number | null} */ (null)
  )
  const colorInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
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

  return (
    <div
      className={cn('flex flex-col', className)}
      style={{
        borderTop: '1px solid var(--ct-border)',
        transition: 'border-color 300ms ease-out',
      }}
    >
      <div className="relative">
        <input
          ref={colorInputRef}
          type="color"
          tabIndex={-1}
          value={
            pickerIndex !== null && colors[pickerIndex]
              ? rgbToHex(colors[pickerIndex])
              : '#000000'
          }
          onChange={(e) => handleColorChange(e.target.value)}
          className="pointer-events-none absolute opacity-0"
          style={{ width: '1px', height: '1px' }}
        />
      </div>

      {colors.map((color, index) => (
        <div
          key={index}
          className="flex items-center border-b-1 pr-2 pl-5"
          style={{
            height: '48px',
            borderColor: 'var(--ct-border)',
            transition: 'border-color 300ms ease-out',
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
        <SubtleButton onClick={onAddColor} className="gap-2 border-b-1">
          <FaPlus size="1em" />
          <span>Add target color</span>
        </SubtleButton>
      )}
    </div>
  )
}
