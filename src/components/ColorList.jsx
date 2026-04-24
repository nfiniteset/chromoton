import ColorSwatch from './ColorSwatch';

export default function ColorList({ colors, onColorChange, onRemoveColor, onAddColor, showPopulation, populationPercentages, contrastColors }) {
  const handleColorChange = (index, hex) => {
    if (!hex || hex.length !== 7) return;

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
          percentage={showPopulation && populationPercentages[index] !== undefined ? populationPercentages[index] : null}
          contrastColors={contrastColors}
        />
      ))}
      <button
        onClick={onAddColor}
        disabled={colors.length >= 5}
        className="w-full py-1.5 mt-0 bg-white/10 rounded-sm text-[11px] tracking-wider uppercase hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          color: contrastColors?.textColor,
          borderColor: contrastColors?.borderColorHover,
          borderWidth: '1px',
          borderStyle: 'solid',
          transition: 'color 300ms ease-out, border-color 300ms ease-out, background-color 300ms ease-out, opacity 300ms ease-out'
        }}
      >
        + Add Color
      </button>
    </div>
  );
}
