export type { RandomizationStrategy, StrategyMetadata, StrategyRegistryEntry } from './types';

// Import strategy classes and metadata
import { NoOpStrategy, metadata as noOpMetadata } from './NoOpStrategy';
import { SimpleRandomStrategy, metadata as simpleMetadata } from './SimpleRandomStrategy';
import { PopulationBasedStrategy, metadata as populationMetadata } from './PopulationBasedStrategy';
import { ThreeTargetStrategy, metadata as threeTargetMetadata } from './ThreeTargetStrategy';

// Export individual strategies for backwards compatibility
export { NoOpStrategy, SimpleRandomStrategy, PopulationBasedStrategy, ThreeTargetStrategy };

// Strategy registry - single source of truth for all strategy metadata
export const STRATEGY_REGISTRY = [
  { metadata: noOpMetadata, Strategy: NoOpStrategy },
  { metadata: populationMetadata, Strategy: PopulationBasedStrategy },
  { metadata: simpleMetadata, Strategy: SimpleRandomStrategy },
  { metadata: threeTargetMetadata, Strategy: ThreeTargetStrategy }
] as const;

// Helper to get strategy by id
export function getStrategyById(id: string) {
  return STRATEGY_REGISTRY.find(entry => entry.metadata.id === id);
}

// Helper to create strategy instance by id
export function createStrategyById(id: string): RandomizationStrategy {
  const entry = getStrategyById(id);
  if (!entry) {
    throw new Error(`Strategy with id "${id}" not found`);
  }
  return new entry.Strategy();
}
