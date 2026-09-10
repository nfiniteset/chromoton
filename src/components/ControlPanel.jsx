import { useState, useRef, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'

import PalettePicker from './PalettePicker'
import ColorList from './ColorList'
import AdvancedControls from './AdvancedControls'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { usePanelVisibility } from './panel/usePanelVisibility'
import PanelShell from './panel/PanelShell'

import SubtleButton from './primitives/Button'
import Divider from './primitives/Divider'
import Typography from './primitives/Typography'
import NavStack from './NavStack/NavStack'
import NavStackView from './NavStack/NavStackView'

import { PALETTE_DISPLAY_NAMES } from '../palettes'

import { FaChevronRight } from 'react-icons/fa6'

// Marks floating UI outside the panel (currently just VariantNav) that
// should count as part of the same focus/hover/hide-prevention region as
// the panel itself — same attribute the cinema panels use.
const UI_SELECTOR = '[data-cinema-ui]'

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
  onReset,
  onPanelStateChange,
  className = '',
}) {
  const { panelRef } = useTheme()
  const [showPalettePicker, setShowPalettePicker] = useState(false)
  const paletteLinkRef = useRef(/** @type {HTMLButtonElement | null} */ (null))
  const prevShowPalettePickerRef = useRef(false)

  const { panelState, isClosing } = usePanelVisibility({
    panelRef,
    uiSelector: UI_SELECTOR,
    onStateChange: onPanelStateChange,
  })

  useKeyboardShortcut({
    id: 'toggle-palette-picker',
    keys: ['p'],
    label: 'Open palette picker',
    handler: () => setShowPalettePicker((prev) => !prev),
  })

  useKeyboardShortcut({
    id: 'toggle-show-population',
    keys: ['s'],
    label: 'Toggle target percentages',
    handler: () => onShowPopulationChange(!showPopulation),
  })

  // Only active while the picker is open, so the second Escape press (once
  // this is unregistered) falls through to KeyboardControls' default blur —
  // which is what actually closes the panel, via the focus-out rule in
  // usePanelVisibility.
  useKeyboardShortcut({
    id: 'close-palette-picker',
    keys: ['Escape'],
    label: 'Close palette picker',
    enabled: showPalettePicker,
    handler: () => setShowPalettePicker(false),
  })

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

  function handlePalettePickerLink() {
    setShowPalettePicker(true)
  }

  return (
    <PanelShell
      panelRef={panelRef}
      panelState={panelState}
      isClosing={isClosing}
      className={className}
    >
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

            <Divider className="" />

            <SubtleButton
              className="justify-center px-5 py-4"
              onClick={onReset}
            >
              Reset
            </SubtleButton>
          </div>
        </NavStackView>

        <NavStackView id="palette-picker">
          <PalettePicker
            palettes={palettes}
            currentPalette={currentPalette}
            onPaletteChange={onPaletteChange}
            onBack={() => setShowPalettePicker(false)}
          />
        </NavStackView>
      </NavStack>
    </PanelShell>
  )
}
