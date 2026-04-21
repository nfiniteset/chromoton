export default function Checkbox({ checked, onChange, label, contrastColors }) {
  return (
    <label
      className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none"
      style={{ color: contrastColors.textColorFaded }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="appearance-none w-4 h-4 rounded bg-white/10 cursor-pointer relative transition-all checked:after:content-['✓'] checked:after:absolute checked:after:top-1/2 checked:after:left-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 checked:after:text-[12px] checked:after:font-bold"
        style={{
          borderColor: contrastColors.borderColorHover,
          borderWidth: '1px',
          borderStyle: 'solid',
          color: contrastColors.textColor
        }}
      />
      {label}
    </label>
  );
}
