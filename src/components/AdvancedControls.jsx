import { cn } from '../lib/utils'
import StrategySelector from './StrategySelector'
import SteppedSlider from './SteppedSlider'

export default function AdvancedControls({
  currentStrategy,
  onStrategyChange,
  clarity,
  isPinned,
  onClarityChange,
  onPinChange,
  className,
}) {
  const resolutionSteps = [160, 240, 320, 480, 640]
  const currentStepIndex = resolutionSteps.findIndex((val) => val >= clarity)
  const stepIndex =
    currentStepIndex === -1 ? resolutionSteps.length - 1 : currentStepIndex

  return (
    <div className={cn('flex flex-col gap-7 pb-7', className)}>
      <div className="flex flex-col gap-2">
        <StrategySelector
          currentStrategy={currentStrategy}
          onStrategyChange={onStrategyChange}
        />
      </div>

      <SteppedSlider
        label="Resolution"
        value={stepIndex}
        displayValue={clarity}
        steps={resolutionSteps}
        onChange={(e) =>
          onClarityChange(resolutionSteps[parseInt(e.target.value)])
        }
      />
    </div>
  )
}
