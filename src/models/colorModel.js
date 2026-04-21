import { PALETTES } from '../palettes';
import {
  getRandomColor,
  getUniqueRandomColorsFromPalette,
  getUniqueRandomColor,
  getColorSuccessCounts
} from '../utils/colorUtils';

/**
 * Color Model - Pure state management for color and palette selection
 *
 * State shape:
 * {
 *   currentPalette: string,
 *   colors: Array<{r: number, g: number, b: number}>,
 *   randomizeEnabled: boolean
 * }
 */

const MIN_COLORS = 1;
const MAX_COLORS = 5;

/**
 * Create initial color state
 */
export function createColorState(paletteName, colors, randomizeEnabled = true) {
  if (!paletteName || !PALETTES[paletteName]) {
    throw new Error('Invalid palette name');
  }
  if (!colors || !Array.isArray(colors) || colors.length < MIN_COLORS) {
    throw new Error('Invalid colors array');
  }

  return {
    currentPalette: paletteName,
    colors: colors.map(c => ({ r: c.r, g: c.g, b: c.b })),
    randomizeEnabled: Boolean(randomizeEnabled)
  };
}

/**
 * Change the current palette, optionally reassigning colors from new palette
 */
export function setPalette(state, paletteName) {
  if (!paletteName || !PALETTES[paletteName]) {
    return state;
  }
  if (state.currentPalette === paletteName) {
    return state;
  }

  const shouldReassignColors = paletteName !== 'custom';
  const newColors = shouldReassignColors
    ? getUniqueRandomColorsFromPalette(paletteName, state.colors.length).map(c => ({
        r: c.red,
        g: c.green,
        b: c.blue
      }))
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
export function addColor(state) {
  if (state.colors.length >= MAX_COLORS) {
    return state;
  }

  const existingColors = state.colors.map(c => ({ red: c.r, green: c.g, blue: c.b }));
  const newColor = getUniqueRandomColor(state.currentPalette, existingColors);

  return {
    ...state,
    colors: [...state.colors, { r: newColor.red, g: newColor.green, b: newColor.blue }]
  };
}

/**
 * Remove a color at the specified index
 */
export function removeColor(state, index) {
  if (typeof index !== 'number' || index < 0 || index >= state.colors.length) {
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
export function changeColor(state, index, color) {
  if (typeof index !== 'number' || index < 0 || index >= state.colors.length) {
    return state;
  }
  if (!color || typeof color.r !== 'number' || typeof color.g !== 'number' || typeof color.b !== 'number') {
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
export function setRandomize(state, enabled) {
  if (typeof enabled !== 'boolean') {
    return state;
  }

  return {
    ...state,
    randomizeEnabled: enabled
  };
}

/**
 * Get colors in the format expected by the simulation
 */
export function getColorsForSimulation(state) {
  return state.colors.map(c => ({ r: c.r, g: c.g, b: c.b }));
}

/**
 * Get available colors from palette that aren't currently in use
 */
export function getAvailableColors(state) {
  const palette = PALETTES[state.currentPalette];
  if (!palette) {
    return [];
  }

  const usedColors = state.colors;
  const availableColors = [];

  for (const paletteColor of palette) {
    const isUsed = usedColors.some(
      used => used.r === paletteColor.red && used.g === paletteColor.green && used.b === paletteColor.blue
    );

    if (!isUsed) {
      availableColors.push({ r: paletteColor.red, g: paletteColor.green, b: paletteColor.blue });
    }
  }

  return availableColors;
}

/**
 * Check if a color is currently in use
 */
export function isColorInUse(state, color) {
  if (!color || typeof color.r !== 'number' || typeof color.g !== 'number' || typeof color.b !== 'number') {
    return false;
  }

  return state.colors.some(c => c.r === color.r && c.g === color.g && c.b === color.b);
}

/**
 * Check if a color can be added
 */
export function canAddColor(state) {
  return state.colors.length < MAX_COLORS;
}

/**
 * Check if a color can be removed
 */
export function canRemoveColor(state) {
  return state.colors.length > MIN_COLORS;
}

/**
 * Determine what random action to take based on population state
 */
export function determineRandomAction(state, population, xDim, yDim) {
  if (!population || !xDim || !yDim) {
    return null;
  }

  const targetColors = state.colors.map(c => ({ red: c.r, green: c.g, blue: c.b }));
  const counts = getColorSuccessCounts(population, targetColors, xDim, yDim);
  const mostSuccessfulIndex = findMaxIndex(counts);

  const availableActions = getAvailableActions(state.colors.length);
  const action = pickRandomAction(availableActions);

  return createActionResult(action, state, mostSuccessfulIndex);
}

/**
 * Apply a random action to the state
 */
export function applyRandomAction(state, action) {
  if (!action || !action.action) {
    return state;
  }

  if (action.action === 'remove' && action.targetIndex !== undefined) {
    return removeColor(state, action.targetIndex);
  }

  if (action.action === 'add' && action.newColor) {
    return {
      ...state,
      colors: [...state.colors, { r: action.newColor.red, g: action.newColor.green, b: action.newColor.blue }]
    };
  }

  if (action.action === 'change' && action.targetIndex !== undefined && action.newColor) {
    const newColors = [...state.colors];
    newColors[action.targetIndex] = {
      r: action.newColor.red,
      g: action.newColor.green,
      b: action.newColor.blue
    };
    return {
      ...state,
      colors: newColors
    };
  }

  return state;
}

// Helper functions for randomizer logic

function findMaxIndex(counts) {
  if (!counts || counts.length === 0) {
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

function getAvailableActions(currentCount) {
  const availableActions = [];

  if (currentCount > MIN_COLORS) {
    availableActions.push('remove');
  }
  if (currentCount < MAX_COLORS) {
    availableActions.push('add');
  }
  availableActions.push('change');

  return availableActions;
}

function pickRandomAction(availableActions) {
  if (!availableActions || availableActions.length === 0) {
    return 'change';
  }

  const actionIndex = Math.floor(Math.random() * availableActions.length);
  return availableActions[actionIndex];
}

function createActionResult(action, state, mostSuccessfulIndex) {
  if (action === 'remove') {
    return { action: 'remove', targetIndex: mostSuccessfulIndex };
  }

  if (action === 'add') {
    const existingColors = state.colors.map(c => ({ red: c.r, green: c.g, blue: c.b }));
    const newColor = getUniqueRandomColor(state.currentPalette, existingColors);
    return { action: 'add', newColor };
  }

  if (action === 'change') {
    const newColor = getColorForChange(state, mostSuccessfulIndex);
    return { action: 'change', targetIndex: mostSuccessfulIndex, newColor };
  }

  return null;
}

function getColorForChange(state, excludeIndex) {
  const palette = PALETTES[state.currentPalette];
  const isCustomMode = palette === null;

  if (isCustomMode) {
    return getRandomColor(state.currentPalette);
  }

  const availableColors = findAvailableColorsExcluding(state, excludeIndex);
  const hasAvailableColors = availableColors.length > 0;

  return hasAvailableColors
    ? selectRandomFromArray(availableColors)
    : getRandomColor(state.currentPalette);
}

function findAvailableColorsExcluding(state, excludeIndex) {
  const palette = PALETTES[state.currentPalette];
  if (!palette) {
    return [];
  }

  const availableColors = [];

  for (const paletteColor of palette) {
    const isInUse = isColorInTargetsExcluding(paletteColor, state.colors, excludeIndex);

    if (!isInUse) {
      availableColors.push(paletteColor);
    }
  }

  return availableColors;
}

function isColorInTargetsExcluding(paletteColor, targetColors, excludeIndex) {
  for (let j = 0; j < targetColors.length; j++) {
    if (j === excludeIndex) {
      continue;
    }

    const target = targetColors[j];
    if (
      target.r === paletteColor.red &&
      target.g === paletteColor.green &&
      target.b === paletteColor.blue
    ) {
      return true;
    }
  }

  return false;
}

function selectRandomFromArray(colors) {
  if (!colors || colors.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * colors.length);
  const selectedColor = colors[index];
  return {
    red: selectedColor.red,
    green: selectedColor.green,
    blue: selectedColor.blue
  };
}
