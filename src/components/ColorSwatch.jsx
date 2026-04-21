export default function ColorSwatch({ color, onColorChange, onRemove, canRemove, contrastColors }) {
  const rgbToHex = (r, g, b) => {
    const hexValues = [r, g, b].map(v => v.toString(16).padStart(2, '0'));
    const hexString = '#' + hexValues.join('');
    return hexString;
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1 h-8 rounded-sm overflow-hidden cursor-pointer">
        <div
          className="w-full h-full rounded-sm box-border transition-colors"
          style={{
            background: `rgb(${color.r}, ${color.g}, ${color.b})`,
            borderColor: contrastColors?.borderColorHover,
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
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
          className="w-8 h-8 bg-white/10 cursor-pointer rounded-sm text-lg leading-none p-0 transition-colors hover:bg-white/15"
          style={{
            color: contrastColors?.textColor,
            borderColor: contrastColors?.borderColorHover,
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
