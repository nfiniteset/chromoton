export default function PaletteSelector({
  palettes,
  currentPalette,
  onPaletteChange,
  onShowPicker,
  contrastColors,
}) {
  const formatPaletteName = (name) => {
    if (name === 'none') {
      return 'None'
    }

    const formattedName = name.charAt(0).toUpperCase() + name.slice(1)
    return formattedName
  }

  return (
    <button
      onClick={onShowPicker}
      className="flex w-full cursor-pointer items-center justify-between rounded-sm border-none bg-white/10 px-2 py-2 text-[11px] tracking-wider uppercase hover:bg-white/15 focus:ring-2 focus:outline-none"
      style={{
        color: contrastColors?.textColor,
        borderColor: contrastColors?.borderColorHover,
        borderWidth: '1px',
        borderStyle: 'solid',
        transition:
          'color 300ms ease-out, border-color 300ms ease-out, background-color 300ms ease-out',
      }}
    >
      <span>{formatPaletteName(currentPalette)}</span>
      <span className="text-[10px]">▶</span>
    </button>
  )
}
