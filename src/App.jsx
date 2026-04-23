import { useState, useEffect, useMemo } from 'react';
import Chromoton from './Chromoton';
import ControlPanel from './components/ControlPanel';
import { PALETTES, getRandomPaletteName } from './palettes';
import { getUniqueRandomColorsFromPalette } from './utils/colorUtils';
import { useColorModel } from './hooks/useColorModel';
import { useColorRandomizer } from './hooks/useColorRandomizer';
import { PopulationBasedStrategy, SimpleRandomStrategy } from './strategies';

function App() {
  const [clarity, setClarity] = useState(240);
  const [mutationRate, setMutationRate] = useState(0.002);
  const [strategyType, setStrategyType] = useState('population');

  // Initialize palette and colors once
  const initialPaletteName = useMemo(() => getRandomPaletteName(), []);
  const initialColors = useMemo(
    () => getUniqueRandomColorsFromPalette(initialPaletteName, 3),
    [initialPaletteName]
  );

  // Use the color model for all color/palette state management
  const colorModel = useColorModel(initialPaletteName, initialColors, true);

  // Create randomization strategy based on selected type
  const randomizationStrategy = useMemo(() => {
    switch (strategyType) {
      case 'simple':
        return new SimpleRandomStrategy();
      case 'population':
      default:
        return new PopulationBasedStrategy();
    }
  }, [strategyType]);

  // Sync colors to chromoton engine whenever they change
  useEffect(() => {
    if (window.chromoton) {
      const colorsForSim = colorModel.getColorsForSimulation();
      window.chromoton.setTargetColors(colorsForSim);
    }
  }, [colorModel.colors, colorModel.getColorsForSimulation]);

  // Use the color randomizer hook with strategy
  useColorRandomizer(
    colorModel.randomizeEnabled,
    randomizationStrategy,
    {
      currentPalette: colorModel.currentPalette,
      colors: colorModel.colors,
      randomizeEnabled: colorModel.randomizeEnabled
    },
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
        randomizeColor={colorModel.randomizeEnabled}
        strategyType={strategyType}
        clarity={clarity}
        mutationRate={mutationRate}
        onPaletteChange={colorModel.setPalette}
        onStrategyChange={setStrategyType}
        onColorChange={handleColorChange}
        onRemoveColor={colorModel.removeColor}
        onAddColor={colorModel.addColor}
        onRandomizeToggle={colorModel.setRandomize}
        onClarityChange={setClarity}
        onMutationRateChange={setMutationRate}
      />
    </>
  );
}

export default App;
