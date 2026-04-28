import { useState, useEffect, useRef } from 'react'
import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

import PalettePicker from './PalettePicker'
import ColorList from './ColorList'
import AdvancedControls from './AdvancedControls'
import KeyboardControls from './KeyboardControls'

import SubtleButton from './primitives/Button'
import Typography from './primitives/Typography'
import NavStack from './NavStack/NavStack'
import NavStackView from './NavStack/NavStackView'

import { PALETTE_DISPLAY_NAMES } from '../palettes'

import {
  FaChevronRight,
  FaArrowRightToBracket,
  FaTableColumns,
} from 'react-icons/fa6'

const GLASS_BUTTON_CLASSES =
  "relative flex items-center justify-center rounded-xl bg-white/8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl backdrop-saturate-[180%] before:pointer-events-none before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-white/30 before:via-white/5 before:to-white/10 before:[mask-composite:exclude] before:p-px before:content-[''] before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]"

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
  onSwapColor,
  onAddColor,
  onClarityChange,
  fps,
  onFpsChange,
  onShowPopulationChange,
  className = '',
}) {
  const { panelRef } = useTheme()
  const [showPalettePicker, setShowPalettePicker] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [isHiding, setIsHiding] = useState(false)
  const [showOpenButton, setShowOpenButton] = useState(false)
  const mouseTimerRef = useRef(
    /** @type {ReturnType<typeof setTimeout> | null} */ (null)
  )
  const paletteLinkRef = useRef(/** @type {HTMLButtonElement | null} */ (null))
  const prevShowPalettePickerRef = useRef(false)

  const showPanel = () => {
    setIsHiding(false)
    setIsHidden(false)
    setShowOpenButton(false)
    if (mouseTimerRef.current) {
      clearTimeout(mouseTimerRef.current)
    }
    requestAnimationFrame(() => paletteLinkRef.current?.focus())
  }

  const hidePanel = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    setIsHiding(true)
    requestAnimationFrame(() => {
      setIsHidden(true)
    })
  }

  // Move focus in/out of palette picker as it opens and closes
  useEffect(() => {
    if (showPalettePicker && !prevShowPalettePickerRef.current) {
      requestAnimationFrame(() => {
        const checked = panelRef.current?.querySelector(
          'input[type="radio"]:checked'
        )
        if (checked instanceof HTMLElement) checked.focus()
      })
    } else if (!showPalettePicker && prevShowPalettePickerRef.current) {
      requestAnimationFrame(() => paletteLinkRef.current?.focus())
    }
    prevShowPalettePickerRef.current = showPalettePicker
  }, [showPalettePicker, panelRef])

  // Show panel on click anywhere on the canvas (outside the panel)
  useEffect(() => {
    const handleClick = (e) => {
      if (isHidden && !panelRef.current?.contains(e.target)) {
        showPanel()
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [isHidden, panelRef])

  // Open button fades in on mouse move, fades out after 3s of stillness
  useEffect(() => {
    if (!isHidden) return

    const handleMouseMove = () => {
      setShowOpenButton(true)
      if (mouseTimerRef.current) {
        clearTimeout(mouseTimerRef.current)
      }
      mouseTimerRef.current = setTimeout(() => {
        setShowOpenButton(false)
      }, 3000)
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (mouseTimerRef.current) {
        clearTimeout(mouseTimerRef.current)
      }
    }
  }, [isHidden])

  const handleTransitionEnd = (e) => {
    if (e.propertyName === 'transform' && isHiding) {
      setIsHiding(false)
    }
  }

  function handlePalettePickerLink() {
    setShowPalettePicker(true)
  }

  const handlePanelKeyDown = (e) => {
    if (e.key !== 'Tab' || isHidden) return
    const container = e.currentTarget
    const focusable = Array.from(
      container.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.closest('[inert]'))
    if (focusable.length < 2) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    }
  }

  return (
    <div
      className={cn(
        'pointer-events-none fixed top-0 right-0 z-[100] h-screen w-[400px]',
        className
      )}
      onKeyDown={handlePanelKeyDown}
    >
      {/* Toggle button — slides between left-of-panel and top-right corner */}
      <div
        className="pointer-events-none absolute top-5 z-10"
        inert={(isHidden && !showOpenButton) || undefined}
        style={{
          right: isHidden ? '20px' : '233px',
          opacity: !isHidden || showOpenButton ? 1 : 0,
          transition:
            'right 200ms cubic-bezier(0.23,1,0.32,1), opacity 300ms ease-out',
        }}
      >
        <button
          onClick={isHidden ? showPanel : hidePanel}
          className={cn(
            'pointer-events-auto h-9 w-9 cursor-pointer',
            GLASS_BUTTON_CLASSES
          )}
          style={{ color: 'var(--ct-icon)' }}
        >
          <span
            className="relative block"
            style={{ width: '0.9em', height: '0.9em' }}
          >
            <FaArrowRightToBracket
              size="0.9em"
              style={{
                position: 'absolute',
                inset: 0,
                opacity: isHidden ? 0 : 1,
                transition: 'opacity 150ms ease-out',
              }}
            />
            <FaTableColumns
              size="0.9em"
              style={{
                position: 'absolute',
                inset: 0,
                opacity: isHidden ? 1 : 0,
                transition: 'opacity 150ms ease-out',
              }}
            />
          </span>
        </button>
      </div>

      {/* Main panel */}
      <div
        ref={panelRef}
        onTransitionEnd={handleTransitionEnd}
        className="pointer-events-auto absolute top-5 right-5 box-border flex max-h-[calc(100vh-40px)] w-[220px] flex-col gap-4 overflow-x-hidden overflow-y-auto rounded-2xl bg-white/8 text-xs tracking-wider uppercase shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl backdrop-saturate-[180%] before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/30 before:via-white/5 before:to-white/10 before:[mask-composite:exclude] before:p-px before:content-[''] before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]"
        style={{
          transform: isHidden
            ? 'translateX(calc(100% + 20px))'
            : 'translateX(0)',
          transition: `transform 200ms ${isHiding ? 'cubic-bezier(0.755,0.05,0.855,0.06)' : 'cubic-bezier(0.23,1,0.32,1)'}, color 300ms ease-out, border-color 300ms ease-out`,
        }}
      >
        <div className="relative z-[1] overflow-x-hidden overflow-y-auto">
          <NavStack activeView={showPalettePicker ? 'palette-picker' : 'main'}>
            <NavStackView id="main">
              <div className="flex flex-col">
                <div className="flex flex-col">
                  <SubtleButton
                    ref={paletteLinkRef}
                    onClick={handlePalettePickerLink}
                  >
                    <div className="gap-0 text-left">
                      <Typography as="p">Color palette</Typography>
                      <Typography intent="weak" as="p">
                        {PALETTE_DISPLAY_NAMES[currentPalette]}
                      </Typography>
                    </div>
                    <FaChevronRight size="1.5em" />
                  </SubtleButton>
                  <ColorList
                    colors={colors}
                    onColorChange={onColorChange}
                    onRemoveColor={onRemoveColor}
                    onSwapColor={onSwapColor}
                    onAddColor={onAddColor}
                    showPopulation={showPopulation}
                    populationPercentages={populationPercentages}
                  />
                </div>

                <div className="px-5 pt-7">
                  <AdvancedControls
                    currentStrategy={strategyType}
                    onStrategyChange={onStrategyChange}
                    clarity={clarity}
                    fps={fps}
                    onClarityChange={onClarityChange}
                    onFpsChange={onFpsChange}
                  />
                </div>
              </div>
            </NavStackView>

            <NavStackView id="palette-picker" slideFrom="right">
              <PalettePicker
                palettes={palettes}
                currentPalette={currentPalette}
                onPaletteChange={onPaletteChange}
                onBack={() => setShowPalettePicker(false)}
              />
            </NavStackView>
          </NavStack>
        </div>
      </div>

      <KeyboardControls
        showPalettePicker={showPalettePicker}
        setShowPalettePicker={setShowPalettePicker}
        isHidden={isHidden}
        showPanel={showPanel}
        hidePanel={hidePanel}
        showPopulation={showPopulation}
        onShowPopulationChange={onShowPopulationChange}
      />
    </div>
  )
}
