export default function PaletteSelector({ palettes, currentPalette, onPaletteChange }) {
  const formatPaletteName = (name) => {
    if (name === 'custom') return 'Custom';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline text-white/75">
        <span>Color Palette</span>
      </div>
      <select
        value={currentPalette}
        onChange={(e) => onPaletteChange(e.target.value)}
        className="w-full px-2 py-2 bg-white/10 border border-white/20 text-gray-200 cursor-pointer rounded-sm text-[11px] tracking-wider uppercase transition-colors hover:bg-white/15 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/30"
      >
        {palettes.map(palette => (
          <option key={palette} value={palette}>
            {formatPaletteName(palette)}
          </option>
        ))}
      </select>
    </div>
  );
}
