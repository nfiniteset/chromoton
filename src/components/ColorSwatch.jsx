export default function ColorSwatch({ color, onColorChange, onRemove, canRemove, percentage, contrastColors }) {
  const rgbToHex = (r, g, b) => {
    const hexValues = [r, g, b].map(v => v.toString(16).padStart(2, '0'));
    const hexString = '#' + hexValues.join('');
    return hexString;
  };

  const handleColorChange = (e) => {
    console.log('Color picker changed:', e.target.value);
    onColorChange(e.target.value);
  };

  // Calculate luminance to determine text color
  const getLuminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map(val => {
      const v = val / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const luminance = getLuminance(color.r, color.g, color.b);
  const textColor = luminance > 0.5 ? '#000000' : '#ffffff';

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1 h-8 rounded-sm overflow-hidden">
        <div
          className="w-full h-full rounded-sm box-border pointer-events-none"
          style={{
            background: `rgb(${color.r}, ${color.g}, ${color.b})`,
            borderColor: contrastColors?.borderColorHover,
            borderWidth: '1px',
            borderStyle: 'solid',
            transition: 'background 300ms ease-out, border-color 300ms ease-out'
          }}
        />
        {percentage !== null && (
          <div
            className="absolute inset-0 flex items-center justify-center text-xs font-semibold tracking-wide pointer-events-none z-[5]"
            style={{ color: textColor }}
          >
            {percentage.toFixed(1)}%
          </div>
        )}
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
          className="w-8 h-8 bg-white/10 cursor-pointer rounded-sm text-lg leading-none p-0 hover:bg-white/15"
          style={{
            color: contrastColors?.textColor,
            borderColor: contrastColors?.borderColorHover,
            borderWidth: '1px',
            borderStyle: 'solid',
            transition: 'color 300ms ease-out, border-color 300ms ease-out, background-color 300ms ease-out'
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
