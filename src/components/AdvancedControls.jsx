import Checkbox from './Checkbox'
import StrategySelector from './StrategySelector'
import SteppedSlider from './SteppedSlider'

export default function AdvancedControls({
  currentStrategy,
  onStrategyChange,
  clarity,
  showPopulation,
  isPinned,
  onClarityChange,
  onShowPopulationChange,
  onPinChange,
}) {
  const resolutionSteps = [160, 240, 320, 480, 640]
  const currentStepIndex = resolutionSteps.findIndex((val) => val >= clarity)
  const stepIndex =
    currentStepIndex === -1 ? resolutionSteps.length - 1 : currentStepIndex

  return (
    <div className="flex flex-col gap-7 pb-7">
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

      <div className="flex flex-col gap-2">
        <Checkbox
          checked={showPopulation}
          onChange={onShowPopulationChange}
          label="Show Population"
        />
        <Checkbox
          checked={isPinned}
          onChange={onPinChange}
          label="Pin Panel"
        />
      </div>
    </div>
  )
}
