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
      <SubtleButton
        onClick={onBack}
        className="pl-1"
      >
        <span className="flex justify-center items-center">
          <BsChevronLeft size="1em" />
          <span className="pl-1 text-xs tracking-wider uppercase">Back</span>
        </span>
      </SubtleButton>

      <div className="flex flex-col">
        {palettes.map((paletteName) => {
          const palette = PALETTES[paletteName]
          const isSelected = paletteName === currentPalette

          return (
            <button
              key={paletteName}
              onClick={() => handlePaletteClick(paletteName)}
              className="flex cursor-pointer flex-col gap-2 border-none p-3 text-left transition-all px-5 hover:bg-white/30"
              style={{
                backgroundColor: isSelected
                  ? 'rgba(255, 255, 255, 0.50)'
                  : 'rgba(255, 255, 255, 0.05)',
                borderWidth: '1px 0',
                borderStyle: 'solid',
                borderColor: isSelected
                  ? contrastColors?.borderColorHover
                  : 'transparent',
                transition:
                  'background-color 300ms ease-out, border-color 300ms ease-out',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor =
                    'rgba(255, 255, 255, 0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor =
                    'rgba(255, 255, 255, 0.05)'
                }
              }}
            >
              <span
                className="text-[11px] tracking-wider uppercase"
                style={{
                  color: contrastColors?.textColor,
                  transition: 'color 300ms ease-out',
                }}
              >
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
            </button>
          )
        })}
      </div>
    </div>
  )
}
