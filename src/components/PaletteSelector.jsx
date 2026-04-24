export default function PaletteSelector({ palettes, currentPalette, onPaletteChange, contrastColors }) {
  const formatPaletteName = (name) => {
    if (name === 'custom') {
      return 'Custom';
    }

    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    return formattedName;
  };

  return (
    <select
      value={currentPalette}
      onChange={(e) => onPaletteChange(e.target.value)}
      className="w-full px-2 py-2 bg-white/10 cursor-pointer rounded-sm text-[11px] tracking-wider uppercase transition-colors hover:bg-white/15 focus:outline-none focus:ring-2"
      style={{
        color: contrastColors?.textColor,
        borderColor: contrastColors?.borderColorHover,
        borderWidth: '1px',
        borderStyle: 'solid'
      }}
    >
      {palettes.map(palette => (
        <option key={palette} value={palette}>
          {formatPaletteName(palette)}
        </option>
      ))}
    </select>
  );
}
