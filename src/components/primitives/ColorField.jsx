import { useRef } from 'react'
import ColorSwatch from './Swatch'
import IconButton from './IconButton'
import { FaEyeDropper } from 'react-icons/fa6'

const rgbToHex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

/**
 * A single labelled color, with a swatch and an eyedropper that opens the
 * native picker.
 *
 * ColorList does the same job for the main app's *list* of target colors —
 * add, remove, reorder, population readouts. This is the one-color case:
 * a variation that has a fixed set of named colors (a gradient's two ends,
 * an overlay class) wants a labelled row per color, not a list.
 *
 * The <input type="color"> is kept visually hidden and clicked
 * programmatically, same as ColorList — browsers only open the picker from
 * a real click on the input, and the input's own rendering can't be styled
 * to match the panel.
 */
export default function ColorField({ label, color, onChange, className = '' }) {
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null))

  const handleChange = (hex) => {
    if (!hex || hex.length !== 7) return
    onChange({
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    })
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        ref={inputRef}
        type="color"
        tabIndex={-1}
        value={rgbToHex(color)}
        onChange={(e) => handleChange(e.target.value)}
        className="pointer-events-none absolute opacity-0"
        style={{ width: '1px', height: '1px' }}
      />
      <span className="grow text-sm" style={{ color: 'var(--ct-text)' }}>
        {label}
      </span>
      <ColorSwatch
        color={color}
        onClick={() => inputRef.current?.click()}
        className=""
      />
      <IconButton onClick={() => inputRef.current?.click()}>
        <FaEyeDropper size="1em" />
      </IconButton>
    </div>
  )
}
