import { useState, useEffect, useRef } from 'react'
import PalettePicker from './PalettePicker'
import ColorList from './ColorList'
import AdvancedControls from './AdvancedControls'
import SubtleButton from './SubtleButton'
import Typography from './Typography'
import Divider from './Divider'
import NavStack from './NavStack'
import NavStackView from './NavStackView'
import { useTheme } from '../contexts/ThemeContext'

import { BsChevronRight, BsChevronCompactDown } from 'react-icons/bs'

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
  const { panelRef } = useTheme()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPalettePicker, setShowPalettePicker] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [isHiding, setIsHiding] = useState(false)
  const [hideDelay, setHideDelay] = useState(0)
  const [contentHeight, setContentHeight] = useState(null)
  const [isPinned, setIsPinned] = useState(false)
  const hideTimerRef = useRef(null)
  const isHoveringRef = useRef(false)

  const HIDE_DELAY = 500 // half second
  const EDGE_THRESHOLD = 220 // pixels from right edge to trigger show

  // Helper to use View Transition API if available
  const withViewTransition = (updateFn) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        updateFn()
      })
    } else {
      updateFn()
    }
  }

  const showSidebar = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
    }

    setIsHiding(false)
    setHideDelay(0)
    requestAnimationFrame(() => {
      setIsHidden(false)
    })
  }

  const scheduleSidebarHide = () => {
    // Don't hide if panel is pinned
    if (isPinned) {
      return
    }

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
    }

    hideTimerRef.current = setTimeout(() => {
      // If advanced panel is open, delay the slide-out to let height collapse first
      const needsDelay = showAdvanced

      setIsHiding(true)
      setHideDelay(needsDelay ? 300 : 0)

      if (needsDelay) {
        setShowAdvanced(false)
      }

      requestAnimationFrame(() => {
        setIsHidden(true)
      })
    }, HIDE_DELAY)
  }

  const handleMouseEnter = () => {
    isHoveringRef.current = true
    showSidebar()
  }

  const handleMouseLeave = () => {
    isHoveringRef.current = false

    // Don't hide if a color picker is currently open (focused)
    const hasOpenColorPicker = panelRef.current?.querySelector(
      'input[type="color"]:focus'
    )
    if (hasOpenColorPicker) {
      return
    }

    scheduleSidebarHide()
  }

  // Initial auto-hide after 3 seconds (unless pinned)
  useEffect(() => {
    if (isPinned) {
      return
    }

    hideTimerRef.current = setTimeout(() => {
      setIsHiding(true)
      setHideDelay(0) // No advanced panel on initial load
      requestAnimationFrame(() => {
        setIsHidden(true)
      })
    }, 3000)

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
      }
    }
  }, [isPinned])

  // Event listeners for mouse movement and color picker
  useEffect(() => {
    // Handle mouse movement to show sidebar when approaching right edge
    const handleMouseMove = (e) => {
      // Don't trigger show on mouse movement if panel is pinned
      if (isPinned) {
        return
      }

      const distanceFromRight = window.innerWidth - e.clientX
      const isNearRightEdge = distanceFromRight <= EDGE_THRESHOLD

      // Only trigger show if near edge AND panel is currently hidden
      if (!isNearRightEdge || !isHidden) {
        return
      }

      showSidebar()
    }

    // Handle color picker closing - schedule hide if mouse not over panel
    const handleColorPickerBlur = (e) => {
      if (e.target.type === 'color') {
        // Small delay to allow cleanup, then check if we should hide
        setTimeout(() => {
          if (!isHoveringRef.current) {
            scheduleSidebarHide()
          }
        }, 100)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('blur', handleColorPickerBlur, true)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('blur', handleColorPickerBlur, true)
    }
  }, [isHidden, isPinned])

  // Reset showAdvanced when sidebar closes
  useEffect(() => {
    if (isHidden) {
      setShowAdvanced(false)
    }
  }, [isHidden])

  // When pinned, ensure panel is visible
  useEffect(() => {
    if (isPinned && isHidden) {
      showSidebar()
    }
  }, [isPinned, isHidden])

  // Handle transition end to reset isHiding state
  const handleTransitionEnd = (e) => {
    if (e.propertyName === 'transform' && isHiding) {
      setIsHiding(false)
      setHideDelay(0)
    }
  }

  function handlePalettePickerLink() {
    withViewTransition(() => setShowPalettePicker(true))
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="pointer-events-none fixed top-0 right-0 z-[100] h-screen w-[400px]"
    >
      <div
        ref={panelRef}
        onTransitionEnd={handleTransitionEnd}
        className="pointer-events-auto absolute top-5 right-5 box-border flex max-h-[calc(100vh-40px)] w-[220px] flex-col gap-4 overflow-x-hidden overflow-y-auto rounded-2xl bg-white/8 text-xs tracking-wider uppercase shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl backdrop-saturate-[180%] before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/30 before:via-white/5 before:to-white/10 before:[mask-composite:exclude] before:p-px before:content-[''] before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]"
        style={{
          transform: isHidden
            ? 'translateX(calc(100% + 20px))'
            : 'translateX(0)',
          transition: `transform 200ms ${isHiding ? 'cubic-bezier(0.755,0.05,0.855,0.06)' : 'cubic-bezier(0.23,1,0.32,1)'} ${hideDelay}ms, color 300ms ease-out, border-color 300ms ease-out`,
        }}
      >
        <Typography
          as="h2"
          intent="strong"
          className="relative z-[1] m-0 mb-2 px-5 pt-6 text-xs font-medium tracking-[0.12em]"
        >
          Chromoton
        </Typography>

        <div className="relative z-[1] overflow-x-hidden overflow-y-auto">
          <NavStack activeView={showPalettePicker ? 'palette-picker' : 'main'}>
            <NavStackView id="main">
              <div className="flex flex-col gap-7">
                <div className="flex flex-col gap-2">
                  <SubtleButton
                    onClick={handlePalettePickerLink}
                    className="border-y"
                  >
                    <div className="gap-0 text-left">
                      <Typography as="p">Color palette</Typography>
                      <Typography intent="weak" as="p">
                        {currentPalette}
                      </Typography>
                    </div>
                    <BsChevronRight size="1.5em" />
                  </SubtleButton>
                  <div className="px-5">
                    <ColorList
                      colors={colors}
                      onColorChange={onColorChange}
                      onRemoveColor={onRemoveColor}
                      onAddColor={onAddColor}
                      showPopulation={showPopulation}
                      populationPercentages={populationPercentages}
                    />
                  </div>
                </div>

                <Divider />

                <div className="-mt-7">
                  {!showAdvanced && (
                    <SubtleButton
                      onClick={() => setShowAdvanced(true)}
                      className="flex items-center justify-center py-1"
                    >
                      <BsChevronCompactDown size="2em" />
                    </SubtleButton>
                  )}

                  {showAdvanced && (
                    <div className="px-5 pt-7">
                      <AdvancedControls
                        currentStrategy={strategyType}
                        onStrategyChange={onStrategyChange}
                        clarity={clarity}
                        showPopulation={showPopulation}
                        isPinned={isPinned}
                        onClarityChange={onClarityChange}
                        onShowPopulationChange={onShowPopulationChange}
                        onPinChange={setIsPinned}
                      />
                    </div>
                  )}
                </div>
              </div>
            </NavStackView>

            <NavStackView id="palette-picker">
              <PalettePicker
                palettes={palettes}
                currentPalette={currentPalette}
                onPaletteChange={onPaletteChange}
                onBack={() =>
                  withViewTransition(() => setShowPalettePicker(false))
                }
              />
            </NavStackView>
          </NavStack>
        </div>
      </div>
    </div>
  )
}
