import { useState, useEffect, useMemo } from 'react';
import Chromoton from './Chromoton';
import ControlPanel from './components/ControlPanel';
import { PALETTES, getRandomPaletteName } from './palettes';
import { getUniqueRandomColorsFromPalette } from './utils/colorUtils';
import { useColorModel } from './hooks/useColorModel';
import { useColorRandomizer } from './hooks/useColorRandomizer';

function App() {
  const [clarity, setClarity] = useState(240);
  const [mutationRate, setMutationRate] = useState(0.002);

  // Initialize palette and colors once
  const initialPaletteName = useMemo(() => getRandomPaletteName(), []);
  const initialColors = useMemo(
    () => getUniqueRandomColorsFromPalette(initialPaletteName, 3).map(c => ({ r: c.red, g: c.green, b: c.blue })),
    [initialPaletteName]
  );

  // Use the color model for all color/palette state management
  const colorModel = useColorModel(initialPaletteName, initialColors, true);

  // Sync colors to chromoton engine whenever they change
  useEffect(() => {
    if (window.chromoton) {
      const colorsForSim = colorModel.getColorsForSimulation();
      window.chromoton.setTargetColors(colorsForSim);
    }
  }, [colorModel.colors, colorModel.getColorsForSimulation]);

  // Use the color randomizer hook with model functions
  useColorRandomizer(
    colorModel.randomizeEnabled,
    colorModel.determineRandomAction,
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
        clarity={clarity}
        mutationRate={mutationRate}
        onPaletteChange={colorModel.setPalette}
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
