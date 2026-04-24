import { useState, useEffect, useMemo } from 'react';
import Chromoton from './Chromoton';
import ControlPanel from './components/ControlPanel';
import { PALETTES, getRandomPaletteName } from './palettes';
import { getUniqueRandomColorsFromPalette } from './utils/colorUtils';
import { getColorSuccessCounts } from './utils/colorUtils';
import { useColorModel } from './hooks/useColorModel';
import { useColorRandomizer } from './hooks/useColorRandomizer';
import { useLocalStorage } from './hooks/useLocalStorage';
import { PopulationBasedStrategy, SimpleRandomStrategy, NoOpStrategy, ThreeTargetStrategy } from './strategies';

function App() {
  // Persisted settings with defaults
  const [clarity, setClarity] = useLocalStorage('chromoton-clarity', 240);
  const [mutationRate, setMutationRate] = useLocalStorage('chromoton-mutationRate', 0.002);
  const [strategyType, setStrategyType] = useLocalStorage('chromoton-strategyType', 'none');
  const [showPopulation, setShowPopulation] = useLocalStorage('chromoton-showPopulation', true);
  const [populationPercentages, setPopulationPercentages] = useState([]);

  // Initialize palette and colors from localStorage or random defaults
  const initialPaletteName = useMemo(() => {
    try {
      const stored = window.localStorage.getItem('chromoton-palette');
      return stored ? JSON.parse(stored) : getRandomPaletteName();
    } catch {
      return getRandomPaletteName();
    }
  }, []);

  const initialColors = useMemo(() => {
    try {
      const stored = window.localStorage.getItem('chromoton-colors');
      return stored ? JSON.parse(stored) : getUniqueRandomColorsFromPalette(initialPaletteName, 3);
    } catch {
      return getUniqueRandomColorsFromPalette(initialPaletteName, 3);
    }
  }, [initialPaletteName]);

  // Use the color model for all color/palette state management
  const colorModel = useColorModel(initialPaletteName, initialColors);

  // Persist palette and colors to localStorage when they change
  useEffect(() => {
    window.localStorage.setItem('chromoton-palette', JSON.stringify(colorModel.currentPalette));
  }, [colorModel.currentPalette]);

  useEffect(() => {
    window.localStorage.setItem('chromoton-colors', JSON.stringify(colorModel.colors));
  }, [colorModel.colors]);

  // Create randomization strategy based on selected type
  const randomizationStrategy = useMemo(() => {
    switch (strategyType) {
      case 'none':
        return new NoOpStrategy();
      case 'simple':
        return new SimpleRandomStrategy();
      case 'three-target':
        return new ThreeTargetStrategy();
      case 'population':
      default:
        return new PopulationBasedStrategy();
    }
  }, [strategyType]);

  // Memoize colorState to prevent unnecessary re-renders of useColorRandomizer
  const colorState = useMemo(
    () => ({
      currentPalette: colorModel.currentPalette,
      colors: colorModel.colors
    }),
    [colorModel.currentPalette, colorModel.colors]
  );

  // Sync colors to chromoton engine whenever they change
  useEffect(() => {
    if (window.chromoton) {
      const colorsForSim = colorModel.getColorsForSimulation();
      window.chromoton.setTargetColors(colorsForSim);
    }
  }, [colorModel.colors, colorModel.getColorsForSimulation]);

  // Calculate population percentages when showPopulation is enabled
  useEffect(() => {
    if (!showPopulation) {
      setPopulationPercentages([]);
      return;
    }

    const calculatePercentages = () => {
      if (window.chromoton && window.chromoton.getPopulation) {
        const { population, xDim, yDim } = window.chromoton.getPopulation();
        // Count cells that have actually MATCHED each target (deviance <= 20)
        const counts = getColorSuccessCounts(population, colorModel.colors, xDim, yDim, 20);
        const totalCells = xDim * yDim;

        const percentages = counts.map(count =>
          totalCells > 0 ? (count / totalCells) * 100 : 0
        );

        setPopulationPercentages(percentages);
      }
    };

    // Calculate immediately
    calculatePercentages();

    // Update every 500ms
    const interval = setInterval(calculatePercentages, 500);

    return () => clearInterval(interval);
  }, [showPopulation, colorModel.colors]);

  // Use the color randomizer hook with strategy
  useColorRandomizer(
    true, // Always enabled - NoOpStrategy handles "off" state
    randomizationStrategy,
    colorState,
    colorModel.applyRandomAction
  );

  // Handler adapters for UI components
  const handleColorChange = (index, r, g, b) => {
    if (index === undefined || r === undefined || g === undefined || b === undefined) {
      return;
    }
    colorModel.changeColor(index, { r, g, b });
  };

  return (
    <>
      <Chromoton
        width={clarity}
        mutationRate={mutationRate}
        autoStart={true}
      />

      <ControlPanel
        palettes={Object.keys(PALETTES)}
        currentPalette={colorModel.currentPalette}
        colors={colorModel.colors}
        strategyType={strategyType}
        clarity={clarity}
        mutationRate={mutationRate}
        showPopulation={showPopulation}
        populationPercentages={populationPercentages}
        onPaletteChange={colorModel.setPalette}
        onStrategyChange={setStrategyType}
        onColorChange={handleColorChange}
        onRemoveColor={colorModel.removeColor}
        onAddColor={colorModel.addColor}
        onClarityChange={setClarity}
        onMutationRateChange={setMutationRate}
        onShowPopulationChange={setShowPopulation}
      />
    </>
  );
}

export default App;
