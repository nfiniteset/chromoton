import { useState, useEffect, useMemo } from 'react'
import Chromoton from './Chromoton'
import ControlPanel from './components/ControlPanel'
import FpsCounter from './components/FpsCounter'
import KeyboardControls from './components/KeyboardControls'
import CommandMenu from './components/CommandMenu'
import VariantNav from './components/VariantNav'
import { PALETTES, getRandomPaletteName } from './palettes'
import { getUniqueRandomColorsFromPalette } from './utils/colorUtils'
import { getColorSuccessCounts } from './utils/colorUtils'
import { useColorModel } from './hooks/useColorModel'
import { useColorRandomizer } from './hooks/useColorRandomizer'
import { useLocalStorage } from './hooks/useLocalStorage'
import { createStrategyById } from './strategies'
import { ThemeProvider } from './contexts/ThemeContext'
import { generateCircleTestImage } from './utils/imageSource'
import { applyImageMode, clearImageMode } from './utils/imageTargets'

// Identifies the main app in the VariantNav menu (see src/cinema/variants.js).
const VARIANT_ID = 'main'

// Single source of truth for every persisted setting's default, shared
// between each useLocalStorage() call below and the panel's Reset button —
// so "reset to defaults" can never drift from what a fresh session actually
// starts with. Palette and colors have no fixed default: a fresh session
// picks them at random, so Reset re-randomizes rather than restoring a
// constant (see handleReset).
const DEFAULT_CLARITY = 240
const DEFAULT_STRATEGY_TYPE = 'three-target'
const DEFAULT_SHOW_POPULATION = false
const DEFAULT_FPS = 10
const DEFAULT_MONOCHROME = false
const DEFAULT_COLOR_COUNT = 3

function App() {
  // Persisted settings with defaults
  const [clarity, setClarity] = useLocalStorage(
    'chromoton-clarity',
    DEFAULT_CLARITY
  )
  const [strategyType, setStrategyType] = useLocalStorage(
    'chromoton-strategyType',
    DEFAULT_STRATEGY_TYPE
  )
  const [showPopulation, setShowPopulation] = useLocalStorage(
    'chromoton-showPopulation',
    DEFAULT_SHOW_POPULATION
  )
  const [fps, setFps] = useLocalStorage('chromoton-fps', DEFAULT_FPS)
  const [monochrome, setMonochrome] = useLocalStorage(
    'chromoton-monochrome',
    DEFAULT_MONOCHROME
  )
  const [imageModeEnabled, setImageModeEnabled] = useState(false)
  const [showFps, setShowFps] = useState(false)
  const [panelState, setPanelState] = useState(
    /** @type {'open' | 'peek' | 'hidden'} */ ('open')
  )
  const [populationPercentages, setPopulationPercentages] = useState(
    /** @type {number[]} */ ([])
  )

  // Initialize palette and colors from localStorage or random defaults
  const initialPaletteName = useMemo(() => {
    try {
      const stored = window.localStorage.getItem('chromoton-palette')
      return stored ? JSON.parse(stored) : getRandomPaletteName()
    } catch {
      return getRandomPaletteName()
    }
  }, [])

  const initialColors = useMemo(() => {
    try {
      const stored = window.localStorage.getItem('chromoton-colors')
      return stored
        ? JSON.parse(stored)
        : getUniqueRandomColorsFromPalette(
            initialPaletteName,
            DEFAULT_COLOR_COUNT
          )
    } catch {
      return getUniqueRandomColorsFromPalette(
        initialPaletteName,
        DEFAULT_COLOR_COUNT
      )
    }
  }, [initialPaletteName])

  // Use the color model for all color/palette state management
  const colorModel = useColorModel(initialPaletteName, initialColors)

  // Persist palette and colors to localStorage when they change
  useEffect(() => {
    window.localStorage.setItem(
      'chromoton-palette',
      JSON.stringify(colorModel.currentPalette)
    )
  }, [colorModel.currentPalette])

  useEffect(() => {
    window.localStorage.setItem(
      'chromoton-colors',
      JSON.stringify(colorModel.colors)
    )
  }, [colorModel.colors])

  // Create randomization strategy based on selected type
  const randomizationStrategy = useMemo(() => {
    return createStrategyById(strategyType)
  }, [strategyType])

  // Memoize colorState to prevent unnecessary re-renders of useColorRandomizer
  const colorState = useMemo(
    () => ({
      currentPalette: colorModel.currentPalette,
      colors: colorModel.colors,
    }),
    [colorModel.currentPalette, colorModel.colors]
  )

  // Sync fps to chromoton engine whenever it changes
  useEffect(() => {
    if (window.chromoton) {
      window.chromoton.setStepInterval(Math.round(1000 / fps))
    }
  }, [fps])

  // Sync monochrome rendering to chromoton engine whenever it changes
  useEffect(() => {
    if (window.chromoton) {
      window.chromoton.setGrayscale(monochrome)
    }
  }, [monochrome])

  // Toggle image mode ('m' shortcut) using the first two target colors of
  // the active palette as the black/white targets
  useEffect(() => {
    if (!window.chromoton) return

    if (!imageModeEnabled) {
      clearImageMode()
      return
    }

    const [black, white = black] = colorModel.colors
    if (!black) return

    applyImageMode(generateCircleTestImage(256, 256), { black, white })
  }, [imageModeEnabled, colorModel.colors])

  // Sync colors to chromoton engine whenever they change
  useEffect(() => {
    if (window.chromoton) {
      const colorsForSim = colorModel.getColorsForSimulation()
      window.chromoton.setTargetColors(colorsForSim)
    }
  }, [colorModel.colors, colorModel.getColorsForSimulation])

  // Calculate population percentages when showPopulation is enabled
  useEffect(() => {
    if (!showPopulation) return

    const calculatePercentages = () => {
      if (window.chromoton && window.chromoton.getPopulation) {
        const { population, xDim, yDim } = window.chromoton.getPopulation()
        const counts = getColorSuccessCounts(
          population,
          colorModel.colors,
          xDim,
          yDim,
          20
        )
        const totalCells = xDim * yDim

        const percentages = counts.map((count) =>
          totalCells > 0 ? (count / totalCells) * 100 : 0
        )

        setPopulationPercentages(percentages)
      }
    }

    calculatePercentages()

    const interval = setInterval(calculatePercentages, 500)

    return () => {
      clearInterval(interval)
      setPopulationPercentages([])
    }
  }, [showPopulation, colorModel.colors])

  // Use the color randomizer hook with strategy
  useColorRandomizer(
    true, // Always enabled - NoOpStrategy handles "off" state
    randomizationStrategy,
    colorState,
    colorModel.applyRandomAction
  )

  // Handler adapters for UI components
  const handleColorChange = (index, r, g, b) => {
    if (
      index === undefined ||
      r === undefined ||
      g === undefined ||
      b === undefined
    ) {
      return
    }
    colorModel.changeColor(index, { r, g, b })
  }

  // Restores every persisted setting to the DEFAULT_* values above. Palette
  // and colors are re-randomized rather than restored to a constant, since
  // that's exactly what a fresh session with empty localStorage does.
  // Session-only state (image mode, FPS counter) is left alone — it isn't a
  // saved setting anyone would think of as needing a reset.
  const handleReset = () => {
    const paletteName = getRandomPaletteName()
    setClarity(DEFAULT_CLARITY)
    setStrategyType(DEFAULT_STRATEGY_TYPE)
    setShowPopulation(DEFAULT_SHOW_POPULATION)
    setFps(DEFAULT_FPS)
    setMonochrome(DEFAULT_MONOCHROME)
    colorModel.reset(
      paletteName,
      getUniqueRandomColorsFromPalette(paletteName, DEFAULT_COLOR_COUNT)
    )
  }

  return (
    <ThemeProvider>
      <KeyboardControls />
      <CommandMenu />
      <VariantNav current={VARIANT_ID} hidden={panelState === 'hidden'} />

      <Chromoton
        width={clarity}
        autoStart={true}
        onToggleMonochrome={() => setMonochrome(!monochrome)}
        onToggleImageMode={() => setImageModeEnabled((prev) => !prev)}
        onToggleFps={() => setShowFps((prev) => !prev)}
      />

      <FpsCounter show={showFps} />

      <ControlPanel
        palettes={Object.keys(PALETTES)}
        currentPalette={colorModel.currentPalette}
        colors={colorModel.colors}
        strategyType={strategyType}
        clarity={clarity}
        showPopulation={showPopulation}
        populationPercentages={populationPercentages}
        onPaletteChange={colorModel.setPalette}
        onStrategyChange={setStrategyType}
        onColorChange={handleColorChange}
        onRemoveColor={colorModel.removeColor}
        onSwapColor={colorModel.swapColor}
        onAddColor={colorModel.addColor}
        onClarityChange={setClarity}
        fps={fps}
        onFpsChange={setFps}
        onShowPopulationChange={setShowPopulation}
        onReset={handleReset}
        onPanelStateChange={setPanelState}
      />
    </ThemeProvider>
  )
}

export default App
