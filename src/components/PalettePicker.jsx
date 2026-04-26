import { PALETTES, PALETTE_DISPLAY_NAMES } from '../palettes'
import SubtleButton from './SubtleButton'
import ColorSwatch from './ColorSwatch'

import { FaChevronLeft } from 'react-icons/fa6'

export default function PalettePicker({
  palettes,
  currentPalette,
  onPaletteChange,
  onBack,
}) {
  const handlePaletteClick = (paletteName) => {
    onPaletteChange(paletteName)
    onBack()
  }

  return (
    <div className="flex max-h-[calc(100vh-40px)] flex-col">
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

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-7">
        {palettes.map((paletteName) => {
          const palette = PALETTES[paletteName]
          const isSelected = paletteName === currentPalette

          return (
            <SubtleButton
              key={paletteName}
              onClick={() => handlePaletteClick(paletteName)}
              active={isSelected}
              className="py-3"
            >
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
            </SubtleButton>
          )
        })}
      </div>
    </div>
  )

}
