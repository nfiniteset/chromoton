import { useState, useEffect, useCallback } from 'react';
import Chromoton from './Chromoton';
import ControlPanel from './components/ControlPanel';
import { PALETTES, getRandomPaletteName } from './palettes';
import { getUniqueRandomColorsFromPalette, getUniqueRandomColor } from './utils/colorUtils';
import { useColorRandomizer } from './hooks/useColorRandomizer';

function App() {
  const [clarity, setClarity] = useState(240);
  const [mutationRate, setMutationRate] = useState(0.002);
  const [randomizeColor, setRandomizeColor] = useState(true);
  const [currentPalette, setCurrentPalette] = useState(() => getRandomPaletteName());
  const [colors, setColors] = useState(() =>
    getUniqueRandomColorsFromPalette(getRandomPaletteName(), 3).map(c => ({ r: c.red, g: c.green, b: c.blue }))
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
      let newColors = [...prevColors];

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
    setCurrentPalette(palette);

    // When changing palette, reassign all colors from the new palette
    if (palette !== 'custom') {
      const newColors = getUniqueRandomColorsFromPalette(palette, colors.length);
      setColors(newColors.map(c => ({ r: c.red, g: c.green, b: c.blue })));
    }
  };

  const handleColorChange = (index, r, g, b) => {
    setColors(prevColors => {
      const newColors = [...prevColors];
      newColors[index] = { r, g, b };
      return newColors;
    });

    // When user manually changes a color, disable randomization
    setRandomizeColor(false);
  };

  const handleAddColor = () => {
    if (colors.length < 5) {
      const existingColors = colors.map(c => ({ red: c.r, green: c.g, blue: c.b }));
      const newColor = getUniqueRandomColor(currentPalette, existingColors);
      setColors([...colors, { r: newColor.red, g: newColor.green, b: newColor.blue }]);
    }
  };

  const handleRemoveColor = (index) => {
    if (colors.length > 1) {
      setColors(prevColors => prevColors.filter((_, i) => i !== index));
    }
  };

  const handleRandomizeToggle = (checked) => {
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
