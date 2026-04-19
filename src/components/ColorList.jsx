import ColorSwatch from './ColorSwatch';

export default function ColorList({ colors, onColorChange, onRemoveColor, onAddColor }) {
  const handleColorChange = (index, hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    onColorChange(index, r, g, b);
  };

  return (
    <div className="flex flex-col gap-2">
      {colors.map((color, index) => (
        <ColorSwatch
          key={index}
          color={color}
          onColorChange={(hex) => handleColorChange(index, hex)}
          onRemove={() => onRemoveColor(index)}
          canRemove={colors.length > 1}
        />
      ))}
      <button
        onClick={onAddColor}
        disabled={colors.length >= 5}
        className="w-full py-1.5 mt-0 bg-white/10 border border-white/20 text-gray-200 rounded-sm text-[11px] tracking-wider uppercase transition-colors hover:bg-white/15 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + Add Color
      </button>
    </div>
  );
}
