import { useState, useEffect } from 'react';
import Chromoton from './Chromoton';
import ControlPanel from './components/ControlPanel';

function App() {
  const [clarity, setClarity] = useState(240);
  const [mutationRate, setMutationRate] = useState(0.002);
  const [randomizeColor, setRandomizeColor] = useState(true);
  const [currentPalette, setCurrentPalette] = useState('');
  const [palettes, setPalettes] = useState([]);
  const [colors, setColors] = useState([]);

  // Initialize palettes and colors
  useEffect(() => {
    if (window.chromoton) {
      setPalettes(window.chromoton.getPalettes());
      setCurrentPalette(window.chromoton.getCurrentPalette());
      setColors(window.chromoton.getColors());

      // Set up color change callback
      window.chromoton.setColorChangeCallback(() => {
        setColors(window.chromoton.getColors());
      });
    }
  }, []);

  const handlePaletteChange = (palette) => {
    if (window.chromoton) {
      window.chromoton.setPalette(palette);
      setCurrentPalette(palette);
    }
  };

  const handleColorChange = (index, r, g, b) => {
    if (window.chromoton) {
      window.chromoton.setColor(r, g, b, index);
      setRandomizeColor(false);
      window.chromoton.setRandomizeColor(false);
      setColors(window.chromoton.getColors());
    }
  };

  const handleAddColor = () => {
    if (window.chromoton && colors.length < 5) {
      const color = window.chromoton.getUniqueRandomColor();
      window.chromoton.addTargetColor(color.red, color.green, color.blue);
      setColors(window.chromoton.getColors());
    }
  };

  const handleRemoveColor = (index) => {
    if (window.chromoton) {
      window.chromoton.removeTargetColor(index);
      setColors(window.chromoton.getColors());
    }
  };

  const handleRandomizeToggle = (checked) => {
    setRandomizeColor(checked);
    if (window.chromoton) {
      window.chromoton.setRandomizeColor(checked);
    }
  };

  return (
    <>
      <Chromoton
        width={clarity}
        mutationRate={mutationRate}
        autoStart={true}
      />

      <ControlPanel
        palettes={palettes}
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
