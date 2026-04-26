import { useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import Typography from './Typography'

export default function SteppedSlider({
  label,
  value,
  displayValue,
  steps,
  onChange,
}) {
  const { contrastColors } = useTheme()

  // Inject dynamic slider thumb styles based on contrast colors
  useEffect(() => {
    const styleId = 'dynamic-slider-styles'
    let existingStyle = document.getElementById(styleId)

    if (existingStyle) {
      existingStyle.remove()
    }

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        width: 44px !important;
        height: 44px !important;
        background: radial-gradient(circle, ${contrastColors.sliderThumb} 27%, transparent 28%) !important;
        transition: background 300ms ease-out !important;
      }
      input[type="range"]::-moz-range-thumb {
        width: 44px !important;
        height: 44px !important;
        background: radial-gradient(circle, ${contrastColors.sliderThumb} 27%, transparent 28%) !important;
        transition: background 300ms ease-out !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      const styleToRemove = document.getElementById(styleId)
      if (styleToRemove) {
        styleToRemove.remove()
      }
    }
  }, [contrastColors.sliderThumb])

  return (
    <div className="flex flex-col gap-2">
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
          background: contrastColors?.borderColor,
          '--slider-thumb-color': contrastColors?.sliderThumb,
          transition: 'background 300ms ease-out',
        }}
      />
    </div>
  )
}
