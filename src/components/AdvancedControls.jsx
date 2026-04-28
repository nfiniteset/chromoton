import { cn } from '../lib/utils'
import StrategySelector from './StrategySelector'
import SteppedSlider from './primitives/SteppedSlider'

const FPS_STEPS = [5, 10, 15, 20, 25, 30]

export default function AdvancedControls({
  currentStrategy,
  onStrategyChange,
  clarity,
  fps,
  onClarityChange,
  onFpsChange,
  className = '',
}) {
  const resolutionSteps = [160, 240, 320, 480, 640]
  const currentStepIndex = resolutionSteps.findIndex((val) => val >= clarity)
  const stepIndex =
    currentStepIndex === -1 ? resolutionSteps.length - 1 : currentStepIndex

  const fpsStepIndex =
    FPS_STEPS.indexOf(fps) === -1 ? 1 : FPS_STEPS.indexOf(fps)

  return (
    <div className={cn('flex flex-col gap-7 pb-7', className)}>
      <div className="flex flex-col gap-2">
        <StrategySelector
          currentStrategy={currentStrategy}
          onStrategyChange={onStrategyChange}
        />
      </div>

      <SteppedSlider
        label="Speed"
        value={fpsStepIndex}
        displayValue={`${fps} fps`}
        steps={FPS_STEPS}
        onChange={(e) => onFpsChange(FPS_STEPS[parseInt(e.target.value)])}
      />

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
