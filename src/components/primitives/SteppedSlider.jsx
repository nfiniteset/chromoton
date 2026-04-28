import { cn } from '../../lib/utils'
import Typography from './Typography'

export default function SteppedSlider({
  label,
  value,
  displayValue,
  steps,
  onChange,
  className = '',
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between">
        <Typography intent="strong">{label}</Typography>
        <Typography className="text-[11px] tabular-nums" intent="weak">
          {displayValue}
        </Typography>
      </div>
      <input
        type="range"
        min="0"
        max={steps.length - 1}
        step="1"
        value={value}
        onChange={onChange}
        className="h-0.5 w-full cursor-pointer appearance-none rounded-sm outline-none [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full"
        style={{
          background: 'var(--ct-border)',
          transition: 'background 300ms ease-out',
        }}
      />
    </div>
  )
}
