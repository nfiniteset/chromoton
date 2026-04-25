import { useReducer, useCallback } from 'react'
import type { PaletteName } from '../palettes'
import type { Color, ColorState, RandomAction } from '../models/colorModel'
import * as ColorModel from '../models/colorModel'

export type ColorAction =
  | { type: 'SET_PALETTE'; paletteName: PaletteName }
  | { type: 'ADD_COLOR' }
  | { type: 'REMOVE_COLOR'; index: number }
  | { type: 'CHANGE_COLOR'; index: number; color: Color }
  | { type: 'SWAP_COLOR'; index: number }
  | { type: 'APPLY_RANDOM_ACTION'; action: RandomAction }

interface ColorModelHook {
  // State
  currentPalette: PaletteName
  colors: Color[]

  // Actions
  setPalette: (paletteName: PaletteName) => void
  addColor: () => void
  removeColor: (index: number) => void
  changeColor: (index: number, color: Color) => void
  swapColor: (index: number) => void
  applyRandomAction: (action: RandomAction) => void

  // Queries
  getColorsForSimulation: () => Color[]
  getAvailableColors: () => Color[]
  isColorInUse: (color: Color) => boolean
  canAddColor: () => boolean
  canRemoveColor: () => boolean
}

function colorReducer(state: ColorState, action: ColorAction): ColorState {
  switch (action.type) {
    case 'SET_PALETTE':
      return ColorModel.setPalette(state, action.paletteName)
    case 'ADD_COLOR':
      return ColorModel.addColor(state)
    case 'REMOVE_COLOR':
      return ColorModel.removeColor(state, action.index)
    case 'CHANGE_COLOR':
      return ColorModel.changeColor(state, action.index, action.color)
    case 'SWAP_COLOR':
      return ColorModel.swapColor(state, action.index)
    case 'APPLY_RANDOM_ACTION':
      return ColorModel.applyRandomAction(state, action.action)
    default:
      return state
  }
}

/**
 * React hook for managing color and palette state
 */
export function useColorModel(
  initialPalette: PaletteName,
  initialColors: Color[]
): ColorModelHook {
  const [state, dispatch] = useReducer(colorReducer, undefined, () =>
    ColorModel.createColorState(initialPalette, initialColors)
  )

  // Action callbacks - stable references that only dispatch
  const setPalette = useCallback((paletteName: PaletteName) => {
    dispatch({ type: 'SET_PALETTE', paletteName })
  }, [])

  const addColor = useCallback(() => {
    dispatch({ type: 'ADD_COLOR' })
  }, [])

  const removeColor = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_COLOR', index })
  }, [])

  const changeColor = useCallback((index: number, color: Color) => {
    dispatch({ type: 'CHANGE_COLOR', index, color })
  }, [])

  const swapColor = useCallback((index: number) => {
    dispatch({ type: 'SWAP_COLOR', index })
  }, [])

  const applyRandomAction = useCallback((action: RandomAction) => {
    dispatch({ type: 'APPLY_RANDOM_ACTION', action })
  }, [])

  // Query functions - properly depend on state for correct React behavior
  const getColorsForSimulation = useCallback(() => {
    return ColorModel.getColorsForSimulation(state)
  }, [state])

  const getAvailableColors = useCallback(() => {
    return ColorModel.getAvailableColors(state)
  }, [state])

  const isColorInUse = useCallback(
    (color: Color) => {
      return ColorModel.isColorInUse(state, color)
    },
    [state]
  )

  const canAddColor = useCallback(() => {
    return ColorModel.canAddColor(state)
  }, [state])

  const canRemoveColor = useCallback(() => {
    return ColorModel.canRemoveColor(state)
  }, [state])

  return {
    // State
    currentPalette: state.currentPalette,
    colors: state.colors,

    // Actions
    setPalette,
    addColor,
    removeColor,
    changeColor,
    swapColor,
    applyRandomAction,

    // Queries
    getColorsForSimulation,
    getAvailableColors,
    isColorInUse,
    canAddColor,
    canRemoveColor,
  }
}
