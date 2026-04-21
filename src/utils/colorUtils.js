import { PALETTES } from '../palettes';

/**
 * Generate a random color from a palette (or random if custom/null palette)
 */
export function getRandomColor(paletteName) {
  const palette = PALETTES[paletteName];
  const isCustomMode = palette === null;

  const color = isCustomMode
    ? generateRandomCustomColor()
    : selectRandomPaletteColor(palette);

  return color;
}

function generateRandomCustomColor() {
  let newColor;
  do {
    newColor = {
      red: Math.floor(Math.random() * 256),
      green: Math.floor(Math.random() * 256),
      blue: Math.floor(Math.random() * 256)
    };
  } while (newColor.red + newColor.green + newColor.blue > 400);
  return newColor;
}

function selectRandomPaletteColor(palette) {
  const index = Math.floor(Math.random() * palette.length);
  return {
    red: palette[index].red,
    green: palette[index].green,
    blue: palette[index].blue
  };
}

/**
 * Get unique random colors from a palette
 * Returns an array of unique colors (no duplicates)
 */
export function getUniqueRandomColorsFromPalette(paletteName, count) {
  const palette = PALETTES[paletteName];
  const isCustomMode = palette === null;

  const colors = isCustomMode
    ? generateCustomColors(paletteName, count)
    : selectShuffledPaletteColors(palette, count);

  return colors;
}

function generateCustomColors(paletteName, count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(getRandomColor(paletteName));
  }
  return colors;
}

function selectShuffledPaletteColors(palette, count) {
  const shuffled = shuffleArray([...palette]);
  const numColors = Math.min(count, shuffled.length);
  return shuffled.slice(0, numColors).map(color => ({
    red: color.red,
    green: color.green,
    blue: color.blue
  }));
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get a single unique random color not already in target colors
 */
export function getUniqueRandomColor(paletteName, targetColors) {
  const palette = PALETTES[paletteName];
  const isCustomMode = palette === null;

  if (isCustomMode) {
    return getRandomColor(paletteName);
  }

  const availableColors = findAvailableColors(palette, targetColors);
  const hasAvailableColors = availableColors.length > 0;
  const selectedColor = hasAvailableColors
    ? selectRandomFromArray(availableColors)
    : getRandomColor(paletteName);

  return selectedColor;
}

function findAvailableColors(palette, targetColors) {
  const availableColors = [];
  for (let i = 0; i < palette.length; i++) {
    const paletteColor = palette[i];
    const isInUse = isColorInTargets(paletteColor, targetColors);

    if (!isInUse) {
      availableColors.push(paletteColor);
    }
  }
  return availableColors;
}

function isColorInTargets(paletteColor, targetColors) {
  for (let j = 0; j < targetColors.length; j++) {
    const target = targetColors[j];
    if (target.red === paletteColor.red &&
        target.green === paletteColor.green &&
        target.blue === paletteColor.blue) {
      return true;
    }
  }
  return false;
}

function selectRandomFromArray(colors) {
  const index = Math.floor(Math.random() * colors.length);
  const selectedColor = colors[index];
  return {
    red: selectedColor.red,
    green: selectedColor.green,
    blue: selectedColor.blue
  };
}

/**
 * Count how many cells are closest to each target color
 */
export function getColorSuccessCounts(population, targetColors, xDim, yDim) {
  const counts = new Array(targetColors.length).fill(0);

  for (let y = 0; y < yDim; y++) {
    for (let x = 0; x < xDim; x++) {
      const cell = population[y][x];
      const closestColorIndex = findClosestColorIndex(cell, targetColors);
      counts[closestColorIndex]++;
    }
  }

  return counts;
}

function findClosestColorIndex(cell, targetColors) {
  let minDeviance = Infinity;
  let closestColorIndex = 0;

  for (let i = 0; i < targetColors.length; i++) {
    const target = targetColors[i];
    const deviation = calculateColorDeviation(cell, target);
    if (deviation < minDeviance) {
      minDeviance = deviation;
      closestColorIndex = i;
    }
  }

  return closestColorIndex;
}

function calculateColorDeviation(color1, color2) {
  return Math.abs(color1.red - color2.red) +
         Math.abs(color1.green - color2.green) +
         Math.abs(color1.blue - color2.blue);
}
