export default function StrategySelector({ currentStrategy, onStrategyChange, contrastColors }) {
  const strategies = [
    {
      value: 'none',
      label: 'None',
      description: 'Manual control only, no auto-randomization'
    },
    {
      value: 'population',
      label: 'Population-Based',
      description: 'Analyzes simulation to make smart decisions'
    },
    {
      value: 'simple',
      label: 'Simple Random',
      description: 'Purely random, chaotic changes'
    },
    {
      value: 'three-target',
      label: 'Three-Target',
      description: 'Maintains 3 colors, replaces any reaching 50%+'
    }
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline" style={{ color: contrastColors?.textColorAlpha }}>
        <span>Randomization Strategy</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {strategies.map(strategy => (
          <label
            key={strategy.value}
            className="flex items-start gap-2 cursor-pointer select-none group"
          >
            <input
              type="radio"
              name="strategy"
              value={strategy.value}
              checked={currentStrategy === strategy.value}
              onChange={(e) => onStrategyChange(e.target.value)}
              className="mt-0.5 cursor-pointer"
              style={{
                accentColor: contrastColors?.textColor
              }}
            />
            <div className="flex flex-col gap-0.5">
              <span
                className="text-[11px] tracking-wide uppercase transition-colors group-hover:opacity-80"
                style={{ color: contrastColors?.textColor }}
              >
                {strategy.label}
              </span>
              <span
                className="text-[10px] leading-tight"
                style={{ color: contrastColors?.textColorFaded }}
              >
                {strategy.description}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
