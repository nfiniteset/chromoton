import { PALETTES, type PaletteName } from '../palettes';
import {
  getRandomColor,
  getUniqueRandomColorsFromPalette,
  getUniqueRandomColor,
  getColorSuccessCounts
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
  randomizeEnabled: boolean;
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
  colors: Color[],
  randomizeEnabled: boolean = true
): ColorState {
  if (colors.length < MIN_COLORS) {
    throw new Error('Invalid colors array');
  }

  return {
    currentPalette: paletteName,
    colors: colors.map(c => ({ r: c.r, g: c.g, b: c.b })),
    randomizeEnabled
  };
}

/**
 * Change the current palette, optionally reassigning colors from new palette
 */
export function setPalette(state: ColorState, paletteName: PaletteName): ColorState {
  if (state.currentPalette === paletteName) {
    return state;
  }

  const shouldReassignColors = paletteName !== 'custom';
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
    colors: newColors,
    randomizeEnabled: false
  };
}

/**
 * Toggle randomization
 */
export function setRandomize(state: ColorState, enabled: boolean): ColorState {
  return {
    ...state,
    randomizeEnabled: enabled
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
 * Determine what random action to take based on population state
 */
export function determineRandomAction(
  state: ColorState,
  population: Uint8ClampedArray[][],
  xDim: number,
  yDim: number
): RandomAction | null {
  const counts = getColorSuccessCounts(population, state.colors, xDim, yDim);
  const mostSuccessfulIndex = findMaxIndex(counts);

  const availableActions = getAvailableActions(state.colors.length);
  const action = pickRandomAction(availableActions);

  return createActionResult(action, state, mostSuccessfulIndex);
}

/**
 * Apply a random action to the state
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

// Helper functions for randomizer logic

function findMaxIndex(counts: number[]): number {
  if (counts.length === 0) {
    return 0;
  }

  let maxCount = -1;
  let maxIndex = 0;

  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > maxCount) {
      maxCount = counts[i];
      maxIndex = i;
    }
  }

  return maxIndex;
}

function getAvailableActions(currentCount: number): Array<'add' | 'remove' | 'change'> {
  const availableActions: Array<'add' | 'remove' | 'change'> = [];

  if (currentCount > MIN_COLORS) {
    availableActions.push('remove');
  }
  if (currentCount < MAX_COLORS) {
    availableActions.push('add');
  }
  availableActions.push('change');

  return availableActions;
}

function pickRandomAction(availableActions: Array<'add' | 'remove' | 'change'>): 'add' | 'remove' | 'change' {
  if (availableActions.length === 0) {
    return 'change';
  }

  const actionIndex = Math.floor(Math.random() * availableActions.length);
  return availableActions[actionIndex];
}

function createActionResult(
  action: 'add' | 'remove' | 'change',
  state: ColorState,
  mostSuccessfulIndex: number
): RandomAction | null {
  if (action === 'remove') {
    return { action: 'remove', targetIndex: mostSuccessfulIndex };
  }

  if (action === 'add') {
    const newColor = getUniqueRandomColor(state.currentPalette, state.colors);
    return { action: 'add', newColor };
  }

  if (action === 'change') {
    const newColor = getColorForChange(state, mostSuccessfulIndex);
    return { action: 'change', targetIndex: mostSuccessfulIndex, newColor };
  }

  return null;
}

function getColorForChange(state: ColorState, excludeIndex: number): Color {
  const palette = PALETTES[state.currentPalette];
  const isCustomMode = palette === null;

  if (isCustomMode) {
    return getRandomColor(state.currentPalette);
  }

  const availableColors = findAvailableColorsExcluding(state, excludeIndex);
  const hasAvailableColors = availableColors.length > 0;

  return hasAvailableColors
    ? selectRandomFromArray(availableColors)!
    : getRandomColor(state.currentPalette);
}

function findAvailableColorsExcluding(state: ColorState, excludeIndex: number): Color[] {
  const palette = PALETTES[state.currentPalette];
  if (!palette) {
    return [];
  }

  const availableColors: Color[] = [];

  for (const paletteColor of palette) {
    const isInUse = isColorInTargetsExcluding(paletteColor, state.colors, excludeIndex);

    if (!isInUse) {
      availableColors.push(paletteColor);
    }
  }

  return availableColors;
}

function isColorInTargetsExcluding(paletteColor: Color, targetColors: Color[], excludeIndex: number): boolean {
  for (let j = 0; j < targetColors.length; j++) {
    if (j === excludeIndex) {
      continue;
    }

    const target = targetColors[j];
    if (
      target.r === paletteColor.r &&
      target.g === paletteColor.g &&
      target.b === paletteColor.b
    ) {
      return true;
    }
  }

  return false;
}

function selectRandomFromArray(colors: Color[]): Color | null {
  if (colors.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * colors.length);
  const selectedColor = colors[index];
  return {
    r: selectedColor.r,
    g: selectedColor.g,
    b: selectedColor.b
  };
}
