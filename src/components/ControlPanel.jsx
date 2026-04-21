import { useState, useEffect, useRef } from 'react';
import PaletteSelector from './PaletteSelector';
import ColorList from './ColorList';
import AdvancedControls from './AdvancedControls';
import Checkbox from './Checkbox';
import { useCanvasContrast } from '../hooks/useCanvasContrast';

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
  const panelRef = useRef(null);
  const isHoveringRef = useRef(false);
  const contrastColors = useCanvasContrast(panelRef);

  const HIDE_DELAY = 500; // half second
  const EDGE_THRESHOLD = 220; // pixels from right edge to trigger show

  const showSidebar = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    setIsHidden(false);
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
    isHoveringRef.current = true;
    showSidebar();
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;

    // Don't hide if a color picker is currently open (focused)
    const hasOpenColorPicker = panelRef.current?.querySelector('input[type="color"]:focus');
    if (hasOpenColorPicker) {
      return;
    }

    scheduleSidebarHide();
  };

  useEffect(() => {
    // Handle mouse movement to show sidebar when approaching right edge
    const handleMouseMove = (e) => {
      const distanceFromRight = window.innerWidth - e.clientX;
      const isNearRightEdge = distanceFromRight <= EDGE_THRESHOLD;

      if (!isNearRightEdge) {
        return;
      }

      showSidebar();
    };

    // Handle color picker closing - schedule hide if mouse not over panel
    const handleColorPickerBlur = (e) => {
      if (e.target.type === 'color') {
        // Small delay to allow cleanup, then check if we should hide
        setTimeout(() => {
          if (!isHoveringRef.current) {
            scheduleSidebarHide();
          }
        }, 100);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('blur', handleColorPickerBlur, true);

    // Start with sidebar visible for 3 seconds on page load
    hideTimerRef.current = setTimeout(() => {
      setIsHidden(true);
    }, 3000);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('blur', handleColorPickerBlur, true);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  // Inject dynamic slider thumb styles based on contrast colors
  useEffect(() => {
    const styleId = 'dynamic-slider-styles';
    let existingStyle = document.getElementById(styleId);

    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        background: ${contrastColors.sliderThumb} !important;
      }
      input[type="range"]::-moz-range-thumb {
        background: ${contrastColors.sliderThumb} !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [contrastColors.sliderThumb]);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed top-0 right-0 w-[400px] h-screen z-[100] pointer-events-none"
    >
      <div
        ref={panelRef}
        className={`absolute top-5 right-5 max-h-[calc(100vh-40px)] w-[220px] bg-white/8 rounded-2xl px-5 py-6 box-border flex flex-col gap-7 text-xs tracking-wider uppercase overflow-y-auto overflow-x-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl backdrop-saturate-[180%] before:content-[''] before:absolute before:inset-0 before:rounded-2xl before:p-px before:bg-gradient-to-br before:from-white/30 before:via-white/5 before:to-white/10 before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[mask-composite:exclude] before:pointer-events-none transition-transform duration-300 ease-out pointer-events-auto ${
          isHidden ? 'translate-x-[calc(100%+20px)]' : 'translate-x-0'
        }`}
        style={{
          color: contrastColors.textColor,
          borderColor: contrastColors.borderColor,
        }}
      >
      <h2
        className="m-0 mb-1 text-[10px] font-semibold tracking-[0.12em] relative z-[1]"
        style={{ color: contrastColors.textColorHeader }}
      >
        Chromoton
      </h2>

      <div className="flex flex-col gap-2 relative z-[1]">
        <PaletteSelector
          palettes={palettes}
          currentPalette={currentPalette}
          onPaletteChange={onPaletteChange}
          contrastColors={contrastColors}
        />
      </div>

      <div className="flex flex-col gap-2 relative z-[1]">
        <div className="flex justify-between items-center" style={{ color: contrastColors.textColorAlpha }}>
          <span>Target Colors</span>
          <Checkbox
            checked={randomizeColor}
            onChange={onRandomizeToggle}
            label="Randomize"
            contrastColors={contrastColors}
          />
        </div>
        <ColorList
          colors={colors}
          onColorChange={onColorChange}
          onRemoveColor={onRemoveColor}
          onAddColor={onAddColor}
          contrastColors={contrastColors}
        />
      </div>

      <hr className="border-none border-t my-3 relative z-[1]" style={{ borderTopColor: contrastColors.borderColor }} />

      <div className="flex flex-col gap-2 relative z-[1]">
        <Checkbox
          checked={showAdvanced}
          onChange={setShowAdvanced}
          label="More Settings"
          contrastColors={contrastColors}
        />
      </div>

      {showAdvanced && (
        <div className="relative z-[1]">
          <AdvancedControls
            clarity={clarity}
            mutationRate={mutationRate}
            onClarityChange={onClarityChange}
            onMutationRateChange={onMutationRateChange}
            contrastColors={contrastColors}
          />
        </div>
      )}
      </div>
    </div>
  );
}
