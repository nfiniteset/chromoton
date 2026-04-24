# Randomization Strategies

This directory contains pluggable strategies for determining how colors are randomized in the Chromoton simulation.

## Architecture

The randomization logic has been extracted from the color model into pluggable Strategy classes, following the **Strategy Pattern**. This allows you to:

- **Iterate quickly** on randomization algorithms without touching core state management
- **Compare different approaches** by swapping strategies
- **Test strategies** in isolation with mock population data
- **Add new strategies** without modifying existing code

## Available Strategies

### PopulationBasedStrategy (Default)

Analyzes the simulation population to make intelligent decisions about color changes.

**Algorithm:**

1. Counts how many cells are closest to each target color
2. Identifies the most successful color
3. Randomly picks an action (add/remove/change) based on constraints
4. For remove: targets the most successful color
5. For add/change: picks colors not currently in use

**Best for:** Creating dynamic, responsive color evolution based on simulation feedback

### SimpleRandomStrategy

Makes purely random decisions without analyzing the simulation population.

**Algorithm:**

1. Randomly picks a valid action (add/remove/change)
2. Randomly picks a color index (for remove/change)
3. Randomly picks a new color (for add/change)

**Best for:** Testing, debugging, or creating chaotic unpredictable behavior

## Using Strategies

### Basic Usage

In `App.jsx`:

```javascript
import { PopulationBasedStrategy } from './strategies'

function App() {
  // Create strategy instance (memoized for stable reference)
  const strategy = useMemo(() => new PopulationBasedStrategy(), [])

  // Pass to randomizer hook
  useColorRandomizer(enabled, strategy, colorState, onApplyAction)
}
```

### Swapping Strategies

To try a different strategy, just change one line:

```javascript
// Before:
const strategy = useMemo(() => new PopulationBasedStrategy(), [])

// After:
const strategy = useMemo(() => new SimpleRandomStrategy(), [])
```

## Creating a New Strategy

1. Create a new file in `src/strategies/` (e.g., `WeightedStrategy.ts`)
2. Implement the `RandomizationStrategy` interface:

```typescript
import type { ColorState, RandomAction } from '../models/colorModel'
import type { RandomizationStrategy } from './types'

export class WeightedStrategy implements RandomizationStrategy {
  determineAction(
    state: ColorState,
    population: Uint8ClampedArray[][],
    xDim: number,
    yDim: number
  ): RandomAction | null {
    // Your algorithm here
    // Return a RandomAction or null
  }
}
```

3. Export it from `src/strategies/index.ts`:

```typescript
export { WeightedStrategy } from './WeightedStrategy'
```

4. Use it in your app:

```javascript
import { WeightedStrategy } from './strategies'

const strategy = useMemo(() => new WeightedStrategy(), [])
```

## Strategy Interface

All strategies must implement:

```typescript
interface RandomizationStrategy {
  determineAction(
    state: ColorState,
    population: Uint8ClampedArray[][],
    xDim: number,
    yDim: number
  ): RandomAction | null
}
```

**Parameters:**

- `state` - Current color model state (palette, colors, etc.)
- `population` - 2D array of cell color data from the simulation
- `xDim`, `yDim` - Dimensions of the simulation grid

**Returns:**

- `RandomAction` object with `action` ('add'|'remove'|'change') and relevant data
- `null` if no action should be taken

## Tips

- Keep strategies **pure** - no side effects, just return an action
- Use helper methods (private) to keep `determineAction` clean
- Consider making strategies **configurable** with constructor parameters
- Test strategies independently from the React component tree
