import { STRATEGY_REGISTRY } from '../strategies'
import SteppedSlider from './primitives/Slider'

// Slider position to strategy ID mapping
const STRATEGY_MAP = [
  'none', // 0
  'simple', // 1
  'population', // 2
  'three-target', // 3
  'swap-agitation', // 4
]

export default function StrategySelector({
  currentStrategy,
  onStrategyChange,
}) {
  // Get current slider position from strategy ID
  const currentPosition = STRATEGY_MAP.indexOf(currentStrategy)

  // Get current strategy metadata
  const currentMetadata = STRATEGY_REGISTRY.find(
    ({ metadata }) => metadata.id === currentStrategy
  )?.metadata

  const handleSliderChange = (e) => {
    const position = parseInt(e.target.value, 10)
    const strategyId = STRATEGY_MAP[position]
    onStrategyChange(strategyId)
  }

  return (
    <SteppedSlider
      label="Spiciness"
      value={currentPosition}
      displayValue={currentMetadata?.name || 'None'}
      steps={STRATEGY_MAP}
      onChange={handleSliderChange}
    />
  )
}
