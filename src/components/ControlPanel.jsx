import { useState, useEffect, useRef } from 'react';
import PaletteSelector from './PaletteSelector';
import ColorList from './ColorList';
import AdvancedControls from './AdvancedControls';
import SubtleButton from './SubtleButton';
import { useCanvasContrast } from '../hooks/useCanvasContrast';

export default function ControlPanel({
  palettes,
  currentPalette,
  colors,
  strategyType,
  clarity,
  showPopulation,
  populationPercentages,
  onPaletteChange,
  onStrategyChange,
  onColorChange,
  onRemoveColor,
  onAddColor,
  onClarityChange,
  onShowPopulationChange,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [hideDelay, setHideDelay] = useState(0);
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

    setIsHiding(false);
    setHideDelay(0);
    requestAnimationFrame(() => {
      setIsHidden(false);
    });
  };

  const scheduleSidebarHide = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      // If advanced panel is open, delay the slide-out to let height collapse first
      const needsDelay = showAdvanced;

      setIsHiding(true);
      setHideDelay(needsDelay ? 300 : 0);

      if (needsDelay) {
        setShowAdvanced(false);
      }

      requestAnimationFrame(() => {
        setIsHidden(true);
      });
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

  // Initial auto-hide after 3 seconds
  useEffect(() => {
    hideTimerRef.current = setTimeout(() => {
      setIsHiding(true);
      setHideDelay(0); // No advanced panel on initial load
      requestAnimationFrame(() => {
        setIsHidden(true);
      });
    }, 3000);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  // Event listeners for mouse movement and color picker
  useEffect(() => {
    // Handle mouse movement to show sidebar when approaching right edge
    const handleMouseMove = (e) => {
      const distanceFromRight = window.innerWidth - e.clientX;
      const isNearRightEdge = distanceFromRight <= EDGE_THRESHOLD;

      // Only trigger show if near edge AND panel is currently hidden
      if (!isNearRightEdge || !isHidden) {
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

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('blur', handleColorPickerBlur, true);
    };
  }, [isHidden]);

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

  // Reset showAdvanced when sidebar closes
  useEffect(() => {
    if (isHidden) {
      setShowAdvanced(false);
    }
  }, [isHidden]);

  // Handle transition end to reset isHiding state
  const handleTransitionEnd = (e) => {
    if (e.propertyName === 'transform' && isHiding) {
      setIsHiding(false);
      setHideDelay(0);
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed top-0 right-0 w-[400px] h-screen z-[100] pointer-events-none"
    >
      <div
        ref={panelRef}
        onTransitionEnd={handleTransitionEnd}
        className="absolute top-5 right-5 max-h-[calc(100vh-40px)] w-[220px] bg-white/8 rounded-2xl px-5 py-6 box-border flex flex-col gap-7 text-xs tracking-wider uppercase overflow-y-auto overflow-x-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl backdrop-saturate-[180%] before:content-[''] before:absolute before:inset-0 before:rounded-2xl before:p-px before:bg-gradient-to-br before:from-white/30 before:via-white/5 before:to-white/10 before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[mask-composite:exclude] before:pointer-events-none pointer-events-auto"
        style={{
          color: contrastColors.textColor,
          borderColor: contrastColors.borderColor,
          transform: isHidden ? 'translateX(calc(100% + 20px))' : 'translateX(0)',
          transition: `transform 200ms ${isHiding ? 'cubic-bezier(0.755,0.05,0.855,0.06)' : 'cubic-bezier(0.23,1,0.32,1)'} ${hideDelay}ms, color 300ms ease-out, border-color 300ms ease-out`,
        }}
      >
      <h2
        className="m-0 mb-1 text-[10px] font-semibold tracking-[0.12em] relative z-[1]"
        style={{
          color: contrastColors.textColorHeader,
          transition: 'color 300ms ease-out'
        }}
      >
        Chromoton
      </h2>

      <div className="flex flex-col gap-7 relative z-[1]">
        <div className="flex flex-col gap-4">
          <PaletteSelector
            palettes={palettes}
            currentPalette={currentPalette}
            onPaletteChange={onPaletteChange}
            contrastColors={contrastColors}
          />
          <ColorList
            colors={colors}
            onColorChange={onColorChange}
            onRemoveColor={onRemoveColor}
            onAddColor={onAddColor}
            showPopulation={showPopulation}
            populationPercentages={populationPercentages}
            contrastColors={contrastColors}
          />
        </div>

        <hr
          className="border-none h-px -mx-5"
          style={{
            backgroundColor: contrastColors.borderColor,
            transition: 'background-color 300ms ease-out'
          }}
        />

        <div
          className="-mx-5 -mb-6 -mt-7 relative overflow-hidden"
          style={{
            maxHeight: !showAdvanced ? '48px' : '2000px',
            transition: 'max-height 300ms cubic-bezier(0.86,0,0.07,1)'
          }}
        >
          <div className={`absolute inset-0 transition-opacity duration-300 ${!showAdvanced ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <SubtleButton
              onClick={() => setShowAdvanced(true)}
              contrastColors={contrastColors}
            >
              <span>More</span>
              <span className="text-[10px]">▶</span>
            </SubtleButton>
          </div>

          <div className={`px-5 pt-7 pb-6 transition-opacity duration-300 ${showAdvanced ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <AdvancedControls
              currentStrategy={strategyType}
              onStrategyChange={onStrategyChange}
              clarity={clarity}
              showPopulation={showPopulation}
              onClarityChange={onClarityChange}
              onShowPopulationChange={onShowPopulationChange}
              contrastColors={contrastColors}
            />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
