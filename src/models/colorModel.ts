import { PALETTES, type PaletteName } from '../palettes';
import {
  getUniqueRandomColorsFromPalette,
  getUniqueRandomColor
} from '../utils/colorUtils';

/**
 * Color Model - Pure state management for color and palette selection
 */

// Types
export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface ColorState {
  currentPalette: PaletteName;
  colors: Color[];
}

export interface RandomAction {
  action: 'add' | 'remove' | 'change';
  targetIndex?: number;
  newColor?: Color;
}

const MIN_COLORS = 1;
const MAX_COLORS = 5;

/**
 * Create initial color state
 */
export function createColorState(
  paletteName: PaletteName,
  colors: Color[]
): ColorState {
  if (colors.length < MIN_COLORS) {
    throw new Error('Invalid colors array');
  }

  return {
    currentPalette: paletteName,
    colors: colors.map(c => ({ r: c.r, g: c.g, b: c.b }))
  };
}

/**
 * Change the current palette, optionally reassigning colors from new palette
 */
export function setPalette(state: ColorState, paletteName: PaletteName): ColorState {
  if (state.currentPalette === paletteName) {
    return state;
  }

  const shouldReassignColors = paletteName !== 'none';
  const newColors = shouldReassignColors
    ? getUniqueRandomColorsFromPalette(paletteName, state.colors.length)
    : state.colors;

  return {
    ...state,
    currentPalette: paletteName,
    colors: newColors
  };
}

/**
 * Add a new color to the state
 */
export function addColor(state: ColorState): ColorState {
  if (state.colors.length >= MAX_COLORS) {
    return state;
  }

  const newColor = getUniqueRandomColor(state.currentPalette, state.colors);

  return {
    ...state,
    colors: [...state.colors, newColor]
  };
}

/**
 * Remove a color at the specified index
 */
export function removeColor(state: ColorState, index: number): ColorState {
  if (index < 0 || index >= state.colors.length) {
    return state;
  }
  if (state.colors.length <= MIN_COLORS) {
    return state;
  }

  return {
    ...state,
    colors: state.colors.filter((_, i) => i !== index)
  };
}

/**
 * Change a color at the specified index
 */
export function changeColor(state: ColorState, index: number, color: Color): ColorState {
  if (index < 0 || index >= state.colors.length) {
    return state;
  }

  const newColors = [...state.colors];
  newColors[index] = { r: color.r, g: color.g, b: color.b };

  return {
    ...state,
    colors: newColors
  };
}

/**
 * Get colors in the format expected by the simulation
 */
export function getColorsForSimulation(state: ColorState): Color[] {
  return state.colors.map(c => ({ r: c.r, g: c.g, b: c.b }));
}

/**
 * Get available colors from palette that aren't currently in use
 */
export function getAvailableColors(state: ColorState): Color[] {
  const palette = PALETTES[state.currentPalette];
  if (!palette) {
    return [];
  }

  const usedColors = state.colors;
  const availableColors: Color[] = [];

  for (const paletteColor of palette) {
    const isUsed = usedColors.some(
      used => used.r === paletteColor.r && used.g === paletteColor.g && used.b === paletteColor.b
    );

    if (!isUsed) {
      availableColors.push(paletteColor);
    }
  }

  return availableColors;
}

/**
 * Check if a color is currently in use
 */
export function isColorInUse(state: ColorState, color: Color): boolean {
  return state.colors.some(c => c.r === color.r && c.g === color.g && c.b === color.b);
}

/**
 * Check if a color can be added
 */
export function canAddColor(state: ColorState): boolean {
  return state.colors.length < MAX_COLORS;
}

/**
 * Check if a color can be removed
 */
export function canRemoveColor(state: ColorState): boolean {
  return state.colors.length > MIN_COLORS;
}

/**
 * Apply a random action to the state
 *
 * This function executes actions determined by a RandomizationStrategy.
 * The strategy determines WHAT action to take, this function executes it.
 */
export function applyRandomAction(state: ColorState, action: RandomAction): ColorState {
  if (action.action === 'remove' && action.targetIndex !== undefined) {
    return removeColor(state, action.targetIndex);
  }

  if (action.action === 'add' && action.newColor) {
    return {
      ...state,
      colors: [...state.colors, action.newColor]
    };
  }

  if (action.action === 'change' && action.targetIndex !== undefined && action.newColor) {
    const newColors = [...state.colors];
    newColors[action.targetIndex] = action.newColor;
    return {
      ...state,
      colors: newColors
    };
  }

  return state;
}
