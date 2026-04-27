import { cn } from '../lib/utils'
import { PALETTES, PALETTE_DISPLAY_NAMES } from '../palettes'
import SubtleButton from './SubtleButton'
import ColorSwatch from './ColorSwatch'
import { useTheme } from '../contexts/ThemeContext'

import { FaChevronLeft } from 'react-icons/fa6'

export default function PalettePicker({
  palettes,
  currentPalette,
  onPaletteChange,
  onBack,
  className = '',
}) {
  const { contrastColors } = useTheme()

  const handleChange = (paletteName) => {
    onPaletteChange(paletteName)
  }

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    const input = document.activeElement
    if (
      input instanceof HTMLInputElement &&
      input.type === 'radio' &&
      input.name === 'palette'
    ) {
      onPaletteChange(input.value)
      onBack()
    }
  }

  return (
    <div className={cn('flex max-h-[calc(100vh-40px)] flex-col', className)}>
      <SubtleButton
        onClick={onBack}
        className="shrink-0 border-b pl-1"
        style={{ height: '62px' }}
      >
        <span className="flex items-center justify-center">
          <FaChevronLeft size="1em" />
          <span className="pl-1 text-xs tracking-wider uppercase">Back</span>
        </span>
      </SubtleButton>

      <fieldset
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto border-0 p-0 pb-7"
        onKeyDown={handleKeyDown}
        style={{
          '--bg-normal': 'transparent',
          '--bg-hover': contrastColors.backgroundHover,
          '--bg-active': contrastColors.backgroundActive,
          '--bg-active-hover': contrastColors.backgroundActiveHover,
        }}
      >
        <legend className="sr-only">Color palette</legend>

        {palettes.map((paletteName) => {
          const palette = PALETTES[paletteName]
          const isSelected = paletteName === currentPalette

          return (
            <label
              key={paletteName}
              className={cn(
                'subtle-button relative flex w-full cursor-pointer items-center justify-between px-5 py-3 text-[11px] tracking-wider uppercase',
                isSelected && 'subtle-button--active'
              )}
              style={{
                borderColor: isSelected
                  ? contrastColors.borderHover
                  : contrastColors.border,
                color: isSelected
                  ? contrastColors.textActive
                  : contrastColors.text,
                transition:
                  'background-color 300ms ease-out, border-color 300ms ease-out, color 300ms ease-out',
              }}
            >
              <input
                type="radio"
                name="palette"
                value={paletteName}
                checked={isSelected}
                onChange={() => handleChange(paletteName)}
                className="absolute h-px w-px opacity-0"
              />
              <div className="flex w-full flex-col items-start justify-start gap-2 border-0">
                <span className="text-[11px] tracking-wider uppercase">
                  {PALETTE_DISPLAY_NAMES[paletteName]}
                </span>

                {palette && (
                  <div className="flex gap-1.5">
                    {palette.map((color, index) => (
                      <ColorSwatch key={index} color={color} />
                    ))}
                  </div>
                )}

                {!palette && (
                  <div className="flex gap-1.5">
                    {[...Array(6)].map((_, index) => (
                      <ColorSwatch key={index} placeholder />
                    ))}
                  </div>
                )}
              </div>
            </label>
          )
        })}
      </fieldset>
    </div>
  )
}
