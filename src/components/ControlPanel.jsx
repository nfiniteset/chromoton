import { useState, useEffect, useRef } from 'react';
import PaletteSelector from './PaletteSelector';
import ColorList from './ColorList';
import AdvancedControls from './AdvancedControls';

export default function ControlPanel({
  palettes,
  currentPalette,
  colors,
  randomizeColor,
  clarity,
  mutationRate,
  onPaletteChange,
  onColorChange,
  onRemoveColor,
  onAddColor,
  onRandomizeToggle,
  onClarityChange,
  onMutationRateChange,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const hideTimerRef = useRef(null);

  const HIDE_DELAY = 500; // half second
  const EDGE_THRESHOLD = 220; // pixels from right edge to trigger show

  const showSidebar = () => {
    setIsHidden(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  };

  const scheduleSidebarHide = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setIsHidden(true);
    }, HIDE_DELAY);
  };

  const handleMouseEnter = () => {
    showSidebar();
  };

  const handleMouseLeave = () => {
    scheduleSidebarHide();
  };

  useEffect(() => {
    // Handle mouse movement to show sidebar when approaching right edge
    const handleMouseMove = (e) => {
      const distanceFromRight = window.innerWidth - e.clientX;
      if (distanceFromRight <= EDGE_THRESHOLD) {
        showSidebar();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    // Start with sidebar visible for 3 seconds on page load
    hideTimerRef.current = setTimeout(() => {
      setIsHidden(true);
    }, 3000);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed top-5 right-5 max-h-[calc(100vh-40px)] w-[220px] bg-white/8 border border-white/[0.18] rounded-2xl px-5 py-6 box-border flex flex-col gap-7 z-[100] text-xs tracking-wider uppercase overflow-y-auto overflow-x-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl backdrop-saturate-[180%] before:content-[''] before:absolute before:inset-0 before:rounded-2xl before:p-px before:bg-gradient-to-br before:from-white/30 before:via-white/5 before:to-white/10 before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[mask-composite:exclude] before:pointer-events-none transition-transform duration-300 ease-out ${
        isHidden ? 'translate-x-[calc(100%+20px)]' : 'translate-x-0'
      }`}
    >
      <h2 className="m-0 mb-1 text-[10px] font-semibold text-white/35 tracking-[0.12em] relative z-[1]">
        Chromoton
      </h2>

      <div className="flex flex-col gap-2 relative z-[1]">
        <PaletteSelector
          palettes={palettes}
          currentPalette={currentPalette}
          onPaletteChange={onPaletteChange}
        />
      </div>

      <div className="flex flex-col gap-2 relative z-[1]">
        <div className="flex justify-between items-center text-white/75">
          <span>Target Colors</span>
          <label className="flex items-center gap-1.5 text-[11px] text-white/45 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={randomizeColor}
              onChange={(e) => onRandomizeToggle(e.target.checked)}
              className="appearance-none w-4 h-4 rounded border border-white/20 bg-white/10 cursor-pointer relative transition-all checked:after:content-['✓'] checked:after:absolute checked:after:top-1/2 checked:after:left-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 checked:after:text-[12px] checked:after:font-bold"
            />
            Randomize
          </label>
        </div>
        <ColorList
          colors={colors}
          onColorChange={onColorChange}
          onRemoveColor={onRemoveColor}
          onAddColor={onAddColor}
        />
      </div>

      <hr className="border-none border-t border-white/[0.08] my-3 relative z-[1]" />

      <div className="flex flex-col gap-2 relative z-[1]">
        <label className="flex items-center gap-1.5 text-[11px] text-white/45 cursor-pointer select-none justify-start">
          <input
            type="checkbox"
            checked={showAdvanced}
            onChange={(e) => setShowAdvanced(e.target.checked)}
            className="appearance-none w-4 h-4 rounded border border-white/20 bg-white/10 cursor-pointer relative transition-all checked:after:content-['✓'] checked:after:absolute checked:after:top-1/2 checked:after:left-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 checked:after:text-[12px] checked:after:font-bold"
          />
          More Settings
        </label>
      </div>

      {showAdvanced && (
        <div className="relative z-[1]">
          <AdvancedControls
            clarity={clarity}
            mutationRate={mutationRate}
            onClarityChange={onClarityChange}
            onMutationRateChange={onMutationRateChange}
          />
        </div>
      )}
    </div>
  );
}
