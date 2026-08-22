import { cn } from '../lib/utils'
import StrategySelector from './StrategySelector'
import SteppedSlider from './primitives/Slider'

const FPS_STEPS = [5, 10, 15, 20, 25, 30]

export default function AdvancedControls({
  currentStrategy,
  onStrategyChange,
  clarity,
  fps,
  onClarityChange,
  onFpsChange,
  hideStrategy = false,
  // Skip the wrapping div/spacing entirely and render the controls as
  // direct children instead — for callers (e.g. cinema's "Simulation"
  // section) that already provide their own section container and want
  // these sliders to sit flush alongside its other direct children.
  bare = false,
  className = '',
}) {
  const resolutionSteps = [160, 240, 320, 480, 640]
  const currentStepIndex = resolutionSteps.findIndex((val) => val >= clarity)
  const stepIndex =
    currentStepIndex === -1 ? resolutionSteps.length - 1 : currentStepIndex

  const fpsStepIndex =
    FPS_STEPS.indexOf(fps) === -1 ? 1 : FPS_STEPS.indexOf(fps)

  const content = (
    <>
      {!hideStrategy && (
        <div className="flex flex-col gap-2">
          <StrategySelector
            currentStrategy={currentStrategy}
            onStrategyChange={onStrategyChange}
          />
        </div>
      )}

      <SteppedSlider
        label="Frame rate"
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
    </>
  )

  if (bare) return content

  return (
    <div className={cn('flex flex-col gap-7 pb-7', className)}>{content}</div>
  )
}
