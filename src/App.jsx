import { useState, useEffect, useCallback, useMemo } from 'react';
import Chromoton from './Chromoton';
import ControlPanel from './components/ControlPanel';
import { PALETTES, getRandomPaletteName } from './palettes';
import { getUniqueRandomColorsFromPalette, getUniqueRandomColor } from './utils/colorUtils';
import { useColorRandomizer } from './hooks/useColorRandomizer';

function applyColorAction(prevColors, action) {
  const newColors = [...prevColors];

  if (action.action === 'remove' && action.targetIndex !== undefined) {
    newColors.splice(action.targetIndex, 1);
  } else if (action.action === 'add' && action.newColor) {
    newColors.push({
      r: action.newColor.red,
      g: action.newColor.green,
      b: action.newColor.blue
    });
  } else if (action.action === 'change' && action.targetIndex !== undefined && action.newColor) {
    newColors[action.targetIndex] = {
      r: action.newColor.red,
      g: action.newColor.green,
      b: action.newColor.blue
    };
  }

  return newColors;
}

function App() {
  const [clarity, setClarity] = useState(240);
  const [mutationRate, setMutationRate] = useState(0.002);
  const [randomizeColor, setRandomizeColor] = useState(true);

  // Initialize palette name once to ensure sync between currentPalette and colors
  const initialPaletteName = useMemo(() => getRandomPaletteName(), []);
  const [currentPalette, setCurrentPalette] = useState(initialPaletteName);
  const [colors, setColors] = useState(() =>
    getUniqueRandomColorsFromPalette(initialPaletteName, 3).map(c => ({ r: c.red, g: c.green, b: c.blue }))
  );

  // Sync colors to chromoton engine whenever they change
  useEffect(() => {
    if (window.chromoton) {
      window.chromoton.setTargetColors(colors);
    }
  }, [colors]);

  // Handle color change actions from the randomizer
  const handleColorRandomizerChange = useCallback((action) => {
    setColors(prevColors => {
      if (!action || !action.action) {
        return prevColors;
      }

      const newColors = applyColorAction(prevColors, action);
      return newColors;
    });
  }, []);

  // Use the color randomizer hook
  const targetColorsForRandomizer = colors.map(c => ({
    red: c.r,
    green: c.g,
    blue: c.b
  }));

  useColorRandomizer(
    randomizeColor,
    currentPalette,
    targetColorsForRandomizer,
    handleColorRandomizerChange
  );

  const handlePaletteChange = (palette) => {
    if (!palette) return;

    setCurrentPalette(palette);

    const shouldReassignColors = palette !== 'custom';
    if (shouldReassignColors) {
      const newColors = getUniqueRandomColorsFromPalette(palette, colors.length);
      const formattedColors = newColors.map(c => ({ r: c.red, g: c.green, b: c.blue }));
      setColors(formattedColors);
    }
  };

  const handleColorChange = (index, r, g, b) => {
    if (index === undefined || r === undefined || g === undefined || b === undefined) {
      return;
    }

    setColors(prevColors => {
      const newColors = [...prevColors];
      newColors[index] = { r, g, b };
      return newColors;
    });

    setRandomizeColor(false);
  };

  const handleAddColor = () => {
    if (colors.length >= 5) {
      return;
    }

    const existingColors = colors.map(c => ({ red: c.r, green: c.g, blue: c.b }));
    const newColor = getUniqueRandomColor(currentPalette, existingColors);
    const formattedNewColor = { r: newColor.red, g: newColor.green, b: newColor.blue };
    const updatedColors = [...colors, formattedNewColor];

    setColors(updatedColors);
  };

  const handleRemoveColor = (index) => {
    if (colors.length <= 1) {
      return;
    }

    setColors(prevColors => prevColors.filter((_, i) => i !== index));
  };

  const handleRandomizeToggle = (checked) => {
    if (typeof checked !== 'boolean') {
      return;
    }

    setRandomizeColor(checked);
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
        currentPalette={currentPalette}
        colors={colors}
        randomizeColor={randomizeColor}
        clarity={clarity}
        mutationRate={mutationRate}
        onPaletteChange={handlePaletteChange}
        onColorChange={handleColorChange}
        onRemoveColor={handleRemoveColor}
        onAddColor={handleAddColor}
        onRandomizeToggle={handleRandomizeToggle}
        onClarityChange={setClarity}
        onMutationRateChange={setMutationRate}
      />
    </>
  );
}

export default App;
