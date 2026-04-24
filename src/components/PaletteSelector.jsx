export default function PaletteSelector({ palettes, currentPalette, onPaletteChange, onShowPicker, contrastColors }) {
  const formatPaletteName = (name) => {
    if (name === 'none') {
      return 'None';
    }

    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    return formattedName;
  };

  return (
    <button
      onClick={onShowPicker}
      className="w-full px-2 py-2 bg-white/10 cursor-pointer rounded-sm text-[11px] tracking-wider uppercase hover:bg-white/15 focus:outline-none focus:ring-2 flex justify-between items-center border-none"
      style={{
        color: contrastColors?.textColor,
        borderColor: contrastColors?.borderColorHover,
        borderWidth: '1px',
        borderStyle: 'solid',
        transition: 'color 300ms ease-out, border-color 300ms ease-out, background-color 300ms ease-out'
      }}
    >
      <span>{formatPaletteName(currentPalette)}</span>
      <span className="text-[10px]">▶</span>
    </button>
  );
}
