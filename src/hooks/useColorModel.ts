import { useReducer, useCallback, useRef, useEffect } from 'react';
import type { PaletteName } from '../palettes';
import type { Color, ColorState, RandomAction } from '../models/colorModel';
import * as ColorModel from '../models/colorModel';

export type ColorAction =
  | { type: 'SET_PALETTE'; paletteName: PaletteName }
  | { type: 'ADD_COLOR' }
  | { type: 'REMOVE_COLOR'; index: number }
  | { type: 'CHANGE_COLOR'; index: number; color: Color }
  | { type: 'SET_RANDOMIZE'; enabled: boolean }
  | { type: 'APPLY_RANDOM_ACTION'; action: RandomAction };

interface ColorModelHook {
  // State
  currentPalette: PaletteName;
  colors: Color[];
  randomizeEnabled: boolean;

  // Actions
  setPalette: (paletteName: PaletteName) => void;
  addColor: () => void;
  removeColor: (index: number) => void;
  changeColor: (index: number, color: Color) => void;
  setRandomize: (enabled: boolean) => void;
  applyRandomAction: (action: RandomAction) => void;

  // Queries
  determineRandomAction: (population: Uint8ClampedArray[][], xDim: number, yDim: number) => RandomAction | null;
  getColorsForSimulation: () => Color[];
  getAvailableColors: () => Color[];
  isColorInUse: (color: Color) => boolean;
  canAddColor: () => boolean;
  canRemoveColor: () => boolean;
}

function colorReducer(state: ColorState, action: ColorAction): ColorState {
  switch (action.type) {
    case 'SET_PALETTE':
      return ColorModel.setPalette(state, action.paletteName);
    case 'ADD_COLOR':
      return ColorModel.addColor(state);
    case 'REMOVE_COLOR':
      return ColorModel.removeColor(state, action.index);
    case 'CHANGE_COLOR':
      return ColorModel.changeColor(state, action.index, action.color);
    case 'SET_RANDOMIZE':
      return ColorModel.setRandomize(state, action.enabled);
    case 'APPLY_RANDOM_ACTION':
      return ColorModel.applyRandomAction(state, action.action);
    default:
      return state;
  }
}

/**
 * React hook for managing color and palette state
 */
export function useColorModel(
  initialPalette: PaletteName,
  initialColors: Color[],
  initialRandomize: boolean = true
): ColorModelHook {
  const [state, dispatch] = useReducer(
    colorReducer,
    undefined,
    () => ColorModel.createColorState(initialPalette, initialColors, initialRandomize)
  );

  // Keep a ref to the latest state for stable callbacks
  const stateRef = useRef<ColorState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setPalette = useCallback((paletteName: PaletteName) => {
    dispatch({ type: 'SET_PALETTE', paletteName });
  }, []);

  const addColor = useCallback(() => {
    dispatch({ type: 'ADD_COLOR' });
  }, []);

  const removeColor = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_COLOR', index });
  }, []);

  const changeColor = useCallback((index: number, color: Color) => {
    dispatch({ type: 'CHANGE_COLOR', index, color });
  }, []);

  const setRandomize = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_RANDOMIZE', enabled });
  }, []);

  const applyRandomAction = useCallback((action: RandomAction) => {
    dispatch({ type: 'APPLY_RANDOM_ACTION', action });
  }, []);

  // Query functions using ref for stable callbacks with fresh state
  const determineRandomAction = useCallback((population: Uint8ClampedArray[][], xDim: number, yDim: number) => {
    return ColorModel.determineRandomAction(stateRef.current, population, xDim, yDim);
  }, []);

  const getColorsForSimulation = useCallback(() => {
    return ColorModel.getColorsForSimulation(stateRef.current);
  }, []);

  const getAvailableColors = useCallback(() => {
    return ColorModel.getAvailableColors(stateRef.current);
  }, []);

  const isColorInUse = useCallback((color: Color) => {
    return ColorModel.isColorInUse(stateRef.current, color);
  }, []);

  const canAddColor = useCallback(() => {
    return ColorModel.canAddColor(stateRef.current);
  }, []);

  const canRemoveColor = useCallback(() => {
    return ColorModel.canRemoveColor(stateRef.current);
  }, []);

  return {
    // State
    currentPalette: state.currentPalette,
    colors: state.colors,
    randomizeEnabled: state.randomizeEnabled,

    // Actions
    setPalette,
    addColor,
    removeColor,
    changeColor,
    setRandomize,
    applyRandomAction,

    // Queries
    determineRandomAction,
    getColorsForSimulation,
    getAvailableColors,
    isColorInUse,
    canAddColor,
    canRemoveColor
  };
}
