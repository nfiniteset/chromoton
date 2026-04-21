import { useState, useCallback, useRef, useEffect } from 'react';
import * as ColorModel from '../models/colorModel.ts';

/**
 * React hook for managing color and palette state
 *
 * @param {string} initialPalette - Initial palette name
 * @param {Array} initialColors - Initial colors array
 * @param {boolean} initialRandomize - Initial randomize state
 * @returns {Object} State and action methods
 */
export function useColorModel(initialPalette, initialColors, initialRandomize = true) {
  const [state, setState] = useState(() =>
    ColorModel.createColorState(initialPalette, initialColors, initialRandomize)
  );

  // Keep a ref to the latest state for stable callbacks
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setPalette = useCallback((paletteName) => {
    setState(prevState => ColorModel.setPalette(prevState, paletteName));
  }, []);

  const addColor = useCallback(() => {
    setState(prevState => ColorModel.addColor(prevState));
  }, []);

  const removeColor = useCallback((index) => {
    setState(prevState => ColorModel.removeColor(prevState, index));
  }, []);

  const changeColor = useCallback((index, color) => {
    setState(prevState => ColorModel.changeColor(prevState, index, color));
  }, []);

  const setRandomize = useCallback((enabled) => {
    setState(prevState => ColorModel.setRandomize(prevState, enabled));
  }, []);

  const applyRandomAction = useCallback((action) => {
    setState(prevState => ColorModel.applyRandomAction(prevState, action));
  }, []);

  // Query functions using ref for stable callbacks with fresh state
  const determineRandomAction = useCallback((population, xDim, yDim) => {
    return ColorModel.determineRandomAction(stateRef.current, population, xDim, yDim);
  }, []);

  const getColorsForSimulation = useCallback(() => {
    return ColorModel.getColorsForSimulation(stateRef.current);
  }, []);

  const getAvailableColors = useCallback(() => {
    return ColorModel.getAvailableColors(stateRef.current);
  }, []);

  const isColorInUse = useCallback((color) => {
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
