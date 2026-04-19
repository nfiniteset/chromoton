import { useState, useEffect } from 'react';
import Chromoton from './Chromoton';

function App() {
  const [clarity, setClarity] = useState(240);
  const [mutationRate, setMutationRate] = useState(0.002);
  const [randomizeColor, setRandomizeColor] = useState(true);
  const [currentPalette, setCurrentPalette] = useState('');
  const [palettes, setPalettes] = useState([]);
  const [colors, setColors] = useState([]);
  const [moreSettings, setMoreSettings] = useState(false);

  // Initialize palettes and colors
  useEffect(() => {
    if (window.chromoton) {
      setPalettes(window.chromoton.getPalettes());
      setCurrentPalette(window.chromoton.getCurrentPalette());
      setColors(window.chromoton.getColors());

      // Set up color change callback
      window.chromoton.setColorChangeCallback((newColors) => {
        setColors(window.chromoton.getColors());
      });
    }
  }, []);

  const handlePaletteChange = (e) => {
    const palette = e.target.value;
    if (window.chromoton) {
      window.chromoton.setPalette(palette);
      setCurrentPalette(palette);
    }
  };

  const handleColorChange = (index, hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

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

  const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  };

  return (
    <>
      <Chromoton
        width={clarity}
        mutationRate={mutationRate}
        autoStart={true}
      />

      <div id="controls-panel">
        <h2>Chromoton</h2>

        <div className="control-group">
          <div className="control-label">
            <span>Color Palette</span>
          </div>
          <select
            id="palette-select"
            value={currentPalette}
            onChange={handlePaletteChange}
          >
            {palettes.map(palette => (
              <option key={palette} value={palette}>
                {palette === 'custom' ? 'Custom' : palette.charAt(0).toUpperCase() + palette.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <div className="color-row">
            <span>Target Colors</span>
            <label className="randomize-label">
              <input
                type="checkbox"
                checked={randomizeColor}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRandomizeColor(checked);
                  if (window.chromoton) {
                    window.chromoton.setRandomizeColor(checked);
                  }
                }}
              />
              Randomize
            </label>
          </div>
          <div id="colors-list">
            {colors.map((color, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, height: '32px', borderRadius: '2px', overflow: 'hidden', cursor: 'pointer' }}>
                  <div
                    className="color-swatch-border"
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '2px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.4s ease',
                      background: `rgb(${color.r}, ${color.g}, ${color.b})`
                    }}
                  />
                  <input
                    type="color"
                    value={rgbToHex(color.r, color.g, color.b)}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      border: 'none',
                      padding: 0
                    }}
                  />
                </div>
                {colors.length > 1 && (
                  <button
                    onClick={() => handleRemoveColor(index)}
                    style={{
                      width: '32px',
                      height: '32px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#eee',
                      cursor: 'pointer',
                      borderRadius: '2px',
                      fontSize: '18px',
                      lineHeight: 1,
                      padding: 0,
                      transition: 'color 0.4s ease, border-color 0.4s ease'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            id="add-color-btn"
            onClick={handleAddColor}
            disabled={colors.length >= 5}
            style={{
              width: '100%',
              padding: '6px',
              marginTop: 0,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#eee',
              cursor: colors.length >= 5 ? 'not-allowed' : 'pointer',
              borderRadius: '2px',
              fontSize: '11px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              transition: 'color 0.4s ease, border-color 0.4s ease',
              opacity: colors.length >= 5 ? 0.5 : 1
            }}
          >
            + Add Color
          </button>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '12px 0', position: 'relative', zIndex: 1, transition: 'border-top-color 0.4s ease' }} />

        <div className="control-group">
          <label className="randomize-label" style={{ justifyContent: 'flex-start' }}>
            <input
              type="checkbox"
              checked={moreSettings}
              onChange={(e) => setMoreSettings(e.target.checked)}
            />
            More Settings
          </label>
        </div>

        {moreSettings && (
          <div id="advanced-controls">
            <div className="control-group">
              <div className="control-label">
                <span>Clarity</span>
                <span className="value">{clarity}</span>
              </div>
              <input
                type="range"
                min="20"
                max="300"
                step="1"
                value={clarity}
                onChange={(e) => setClarity(parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <div className="control-label">
                <span>Mutation Rate</span>
                <span className="value">{mutationRate.toFixed(4)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.05"
                step="0.0005"
                value={mutationRate}
                onChange={(e) => setMutationRate(parseFloat(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
