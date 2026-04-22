import { useState, useCallback, useRef, useEffect } from 'react';
import type { PaletteName } from '../palettes';
import type { Color, ColorState, RandomAction } from '../models/colorModel';
import * as ColorModel from '../models/colorModel';

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

/**
 * React hook for managing color and palette state
 */
export function useColorModel(
  initialPalette: PaletteName,
  initialColors: Color[],
  initialRandomize: boolean = true
): ColorModelHook {
  const [state, setState] = useState(() =>
    ColorModel.createColorState(initialPalette, initialColors, initialRandomize)
  );

  // Keep a ref to the latest state for stable callbacks
  const stateRef = useRef<ColorState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setPalette = useCallback((paletteName: PaletteName) => {
    setState(prevState => ColorModel.setPalette(prevState, paletteName));
  }, []);

  const addColor = useCallback(() => {
    setState(prevState => ColorModel.addColor(prevState));
  }, []);

  const removeColor = useCallback((index: number) => {
    setState(prevState => ColorModel.removeColor(prevState, index));
  }, []);

  const changeColor = useCallback((index: number, color: Color) => {
    setState(prevState => ColorModel.changeColor(prevState, index, color));
  }, []);

  const setRandomize = useCallback((enabled: boolean) => {
    setState(prevState => ColorModel.setRandomize(prevState, enabled));
  }, []);

  const applyRandomAction = useCallback((action: RandomAction) => {
    setState(prevState => ColorModel.applyRandomAction(prevState, action));
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
