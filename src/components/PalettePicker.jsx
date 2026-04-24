import { PALETTES } from '../palettes'

export default function PalettePicker({
  palettes,
  currentPalette,
  onPaletteChange,
  onBack,
  contrastColors,
}) {
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
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="-mx-5 flex cursor-pointer items-center gap-2 border-none bg-transparent px-5 pt-4 pb-4 text-left transition-colors hover:bg-white/5"
        style={{
          color: contrastColors?.textColorAlpha,
          transition: 'color 300ms ease-out',
        }}
      >
        <span className="text-[10px]">◀</span>
        <span className="text-xs tracking-wider uppercase">Back</span>
      </button>

      <div className="flex flex-col gap-3">
        {palettes.map((paletteName) => {
          const palette = PALETTES[paletteName]
          const isSelected = paletteName === currentPalette

          return (
            <button
              key={paletteName}
              onClick={() => handlePaletteClick(paletteName)}
              className="flex cursor-pointer flex-col gap-2 rounded-sm border-none p-3 text-left transition-all"
              style={{
                backgroundColor: isSelected
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.05)',
                borderWidth: '1px',
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
