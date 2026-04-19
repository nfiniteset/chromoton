export default function AdvancedControls({ clarity, mutationRate, onClarityChange, onMutationRateChange }) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline text-white/75">
          <span>Clarity</span>
          <span className="text-[11px] text-white/45 tabular-nums">{clarity}</span>
        </div>
        <input
          type="range"
          min="20"
          max="300"
          step="1"
          value={clarity}
          onChange={(e) => onClarityChange(parseInt(e.target.value))}
          className="w-full h-0.5 appearance-none bg-white/15 rounded-sm outline-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                     [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-200 [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-gray-200 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline text-white/75">
          <span>Mutation Rate</span>
          <span className="text-[11px] text-white/45 tabular-nums">{mutationRate.toFixed(4)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="0.05"
          step="0.0005"
          value={mutationRate}
          onChange={(e) => onMutationRateChange(parseFloat(e.target.value))}
          className="w-full h-0.5 appearance-none bg-white/15 rounded-sm outline-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                     [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-200 [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-gray-200 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
        />
      </div>
    </div>
  );
}
