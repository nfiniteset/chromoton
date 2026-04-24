export default function SteppedSlider({
  label,
  value,
  displayValue,
  steps,
  onChange,
  contrastColors
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline" style={{
        color: contrastColors?.textColorAlpha,
        transition: 'color 300ms ease-out'
      }}>
        <span>{label}</span>
        <span className="text-[11px] tabular-nums" style={{
          color: contrastColors?.textColorFaded,
          transition: 'color 300ms ease-out'
        }}>
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max={steps.length - 1}
        step="1"
        value={value}
        onChange={onChange}
        className="w-full h-0.5 appearance-none rounded-sm outline-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
                   [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
        style={{
          background: contrastColors?.borderColor,
          '--slider-thumb-color': contrastColors?.sliderThumb,
          transition: 'background 300ms ease-out'
        }}
      />
    </div>
  );
}
