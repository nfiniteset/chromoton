export default function ColorSwatch({ color, onColorChange, onRemove, canRemove }) {
  const rgbToHex = (r, g, b) => {
    const hexValues = [r, g, b].map(v => v.toString(16).padStart(2, '0'));
    const hexString = '#' + hexValues.join('');
    return hexString;
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1 h-8 rounded-sm overflow-hidden cursor-pointer">
        <div
          className="w-full h-full rounded-sm border border-white/20 box-border transition-colors"
          style={{ background: `rgb(${color.r}, ${color.g}, ${color.b})` }}
        />
        <input
          type="color"
          value={rgbToHex(color.r, color.g, color.b)}
          onChange={(e) => onColorChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer border-none p-0"
        />
      </div>
      {canRemove && (
        <button
          onClick={onRemove}
          className="w-8 h-8 bg-white/10 border border-white/20 text-gray-200 cursor-pointer rounded-sm text-lg leading-none p-0 transition-colors hover:bg-white/15 hover:border-white/30"
        >
          ×
        </button>
      )}
    </div>
  );
}
