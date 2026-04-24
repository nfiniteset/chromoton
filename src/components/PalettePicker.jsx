import { PALETTES } from '../palettes'
import SubtleButton from './SubtleButton'
import { useTheme } from '../contexts/ThemeContext'

import { BsChevronLeft } from 'react-icons/bs'

export default function PalettePicker({
  palettes,
  currentPalette,
  onPaletteChange,
  onBack,
}) {
  const { contrastColors } = useTheme()
  const formatPaletteName = (name) => {
    if (name === 'none') {
      return 'None'
    }

    const formattedName = name.charAt(0).toUpperCase() + name.slice(1)
    return formattedName
  }

  const handlePaletteClick = (paletteName) => {
    onPaletteChange(paletteName)
    onBack()
  }

  return (
    <div className="flex flex-col pb-7">
      <SubtleButton onClick={onBack} className="border-y pl-1">
        <span className="flex items-center justify-center">
          <BsChevronLeft size="1em" />
          <span className="pl-1 text-xs tracking-wider uppercase">Back</span>
        </span>
      </SubtleButton>

      <div className="flex flex-col">
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
                  {formatPaletteName(paletteName)}
                </span>

                {palette && (
                  <div className="flex gap-1.5">
                    {palette.map((color, index) => (
                      <div
                        key={index}
                        className="h-6 w-6 rounded-sm"
                        style={{
                          backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {!palette && (
                  <div className="flex gap-1.5">
                    <div
                      className="h-6 w-6 rounded-sm border"
                      style={{
                        borderColor: contrastColors?.borderColor,
                        borderStyle: 'dashed',
                        transition: 'border-color 300ms ease-out',
                      }}
                    />
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
