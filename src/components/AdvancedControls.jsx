import Checkbox from './Checkbox';
import StrategySelector from './StrategySelector';

export default function AdvancedControls({ currentStrategy, onStrategyChange, clarity, showPopulation, onClarityChange, onShowPopulationChange, contrastColors }) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline" style={{
          color: contrastColors?.textColorAlpha,
          transition: 'color 300ms ease-out'
        }}>
          <span>Resolution</span>
          <span className="text-[11px] tabular-nums" style={{
            color: contrastColors?.textColorFaded,
            transition: 'color 300ms ease-out'
          }}>{clarity}</span>
        </div>
        <input
          type="range"
          min="120"
          max="640"
          step="1"
          value={clarity}
          onChange={(e) => onClarityChange(parseInt(e.target.value))}
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

      <div className="flex flex-col gap-2">
        <StrategySelector
          currentStrategy={currentStrategy}
          onStrategyChange={onStrategyChange}
          contrastColors={contrastColors}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Checkbox
          checked={showPopulation}
          onChange={onShowPopulationChange}
          label="Show Population"
          contrastColors={contrastColors}
        />
      </div>
    </div>
  );
}
