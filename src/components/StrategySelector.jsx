import { STRATEGY_REGISTRY } from '../strategies';

export default function StrategySelector({ currentStrategy, onStrategyChange, contrastColors }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline" style={{
        color: contrastColors?.textColorAlpha,
        transition: 'color 300ms ease-out'
      }}>
        <span>Randomization Strategy</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {STRATEGY_REGISTRY.map(({ metadata }) => (
          <label
            key={metadata.id}
            className="flex items-start gap-2 cursor-pointer select-none group"
          >
            <input
              type="radio"
              name="strategy"
              value={metadata.id}
              checked={currentStrategy === metadata.id}
              onChange={(e) => onStrategyChange(e.target.value)}
              className="mt-0.5 cursor-pointer"
              style={{
                accentColor: contrastColors?.textColor,
                transition: 'accent-color 300ms ease-out'
              }}
            />
            <div className="flex flex-col gap-0.5">
              <span
                className="text-[11px] tracking-wide uppercase group-hover:opacity-80"
                style={{
                  color: contrastColors?.textColor,
                  transition: 'color 300ms ease-out, opacity 300ms ease-out'
                }}
              >
                {metadata.name}
              </span>
              <span
                className="text-[10px] leading-tight"
                style={{
                  color: contrastColors?.textColorFaded,
                  transition: 'color 300ms ease-out'
                }}
              >
                {metadata.description}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
