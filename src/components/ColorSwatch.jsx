export default function ColorSwatch({ color, onColorChange, onRemove, canRemove, contrastColors }) {
  const rgbToHex = (r, g, b) => {
    const hexValues = [r, g, b].map(v => v.toString(16).padStart(2, '0'));
    const hexString = '#' + hexValues.join('');
    return hexString;
  };

  const handleColorChange = (e) => {
    console.log('Color picker changed:', e.target.value);
    onColorChange(e.target.value);
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1 h-8 rounded-sm overflow-hidden">
        <div
          className="w-full h-full rounded-sm box-border transition-colors pointer-events-none"
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
          onChange={handleColorChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer border-none p-0 m-0 z-10"
          style={{ minWidth: '100%', minHeight: '100%' }}
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
