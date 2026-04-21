import { PALETTES } from '../palettes';

/**
 * Generate a random color from a palette (or random if custom/null palette)
 */
export function getRandomColor(paletteName) {
  const palette = PALETTES[paletteName];

  if (palette === null) {
    // Custom mode - generate random color with brightness constraint
    let newColor;
    do {
      newColor = {
        red: Math.floor(Math.random() * 256),
        green: Math.floor(Math.random() * 256),
        blue: Math.floor(Math.random() * 256)
      };
    } while (newColor.red + newColor.green + newColor.blue > 400);
    return newColor;
  } else {
    // Palette mode - pick a random color from the palette
    const index = Math.floor(Math.random() * palette.length);
    return {
      red: palette[index].red,
      green: palette[index].green,
      blue: palette[index].blue
    };
  }
}

/**
 * Get unique random colors from a palette
 * Returns an array of unique colors (no duplicates)
 */
export function getUniqueRandomColorsFromPalette(paletteName, count) {
  const palette = PALETTES[paletteName];

  if (palette === null) {
    // Custom mode - generate unique random colors
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(getRandomColor(paletteName));
    }
    return colors;
  } else {
    // Palette mode - shuffle and take first N colors
    const shuffled = [...palette]; // Copy array

    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Take first 'count' colors (capped at palette length)
    const numColors = Math.min(count, shuffled.length);
    return shuffled.slice(0, numColors).map(color => ({
      red: color.red,
      green: color.green,
      blue: color.blue
    }));
  }
}

/**
 * Get a single unique random color not already in target colors
 */
export function getUniqueRandomColor(paletteName, targetColors) {
  const palette = PALETTES[paletteName];

  if (palette === null) {
    // Custom mode - just get a random color
    return getRandomColor(paletteName);
  } else {
    // Palette mode - find colors not in use
    const availableColors = [];
    for (let i = 0; i < palette.length; i++) {
      const paletteColor = palette[i];
      let isInUse = false;

      // Check if this color is already a target
      for (let j = 0; j < targetColors.length; j++) {
        const target = targetColors[j];
        if (target.red === paletteColor.red &&
            target.green === paletteColor.green &&
            target.blue === paletteColor.blue) {
          isInUse = true;
          break;
        }
      }

      if (!isInUse) {
        availableColors.push(paletteColor);
      }
    }

    // Pick a random color from available colors, or fallback to any palette color
    if (availableColors.length > 0) {
      const index = Math.floor(Math.random() * availableColors.length);
      const selectedColor = availableColors[index];
      return {
        red: selectedColor.red,
        green: selectedColor.green,
        blue: selectedColor.blue
      };
    } else {
      // All palette colors are in use, just pick any
      return getRandomColor(paletteName);
    }
  }
}

/**
 * Count how many cells are closest to each target color
 */
export function getColorSuccessCounts(population, targetColors, xDim, yDim) {
  const counts = new Array(targetColors.length).fill(0);

  for (let y = 0; y < yDim; y++) {
    for (let x = 0; x < xDim; x++) {
      const cell = population[y][x];
      let minDeviance = Infinity;
      let closestColorIndex = 0;

      // Find which target color this cell is closest to
      for (let i = 0; i < targetColors.length; i++) {
        const target = targetColors[i];
        const deviation = Math.abs(cell.red - target.red) +
                         Math.abs(cell.green - target.green) +
                         Math.abs(cell.blue - target.blue);
        if (deviation < minDeviance) {
          minDeviance = deviation;
          closestColorIndex = i;
        }
      }
      counts[closestColorIndex]++;
    }
  }
  return counts;
}

/**
 * Determine what color change action to take based on current state
 * Returns: { action: 'add'|'remove'|'change', targetIndex?: number, newColor?: {red, green, blue} }
 */
export function determineColorChangeAction(paletteName, targetColors, population, xDim, yDim) {
  // Find the most successful color (the one with the most cells closest to it)
  const counts = getColorSuccessCounts(population, targetColors, xDim, yDim);
  let maxCount = -1;
  let mostSuccessfulIndex = 0;

  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > maxCount) {
      maxCount = counts[i];
      mostSuccessfulIndex = i;
    }
  }

  // Determine available actions based on current color count (min 1, max 5)
  const currentCount = targetColors.length;
  const availableActions = [];

  if (currentCount > 1) {
    availableActions.push('remove');  // Can remove if we have more than 1
  }
  if (currentCount < 5) {
    availableActions.push('add');     // Can add if we have fewer than 5
  }
  availableActions.push('change');    // Can always change

  // Randomly pick an action
  const actionIndex = Math.floor(Math.random() * availableActions.length);
  const action = availableActions[actionIndex];

  if (action === 'remove') {
    return { action: 'remove', targetIndex: mostSuccessfulIndex };
  } else if (action === 'add') {
    const newColor = getUniqueRandomColor(paletteName, targetColors);
    return { action: 'add', newColor };
  } else if (action === 'change') {
    const palette = PALETTES[paletteName];
    let newColor;

    if (palette === null) {
      // Custom mode - just get a random color
      newColor = getRandomColor(paletteName);
    } else {
      // Palette mode - ensure we pick a color not already in use
      const availableColors = [];
      for (let i = 0; i < palette.length; i++) {
        const paletteColor = palette[i];
        let isInUse = false;

        // Check if this color is already a target (excluding the one we're replacing)
        for (let j = 0; j < targetColors.length; j++) {
          if (j !== mostSuccessfulIndex) {
            const target = targetColors[j];
            if (target.red === paletteColor.red &&
                target.green === paletteColor.green &&
                target.blue === paletteColor.blue) {
              isInUse = true;
              break;
            }
          }
        }

        if (!isInUse) {
          availableColors.push(paletteColor);
        }
      }

      // Pick a random color from available colors, or fallback to any palette color
      if (availableColors.length > 0) {
        const index = Math.floor(Math.random() * availableColors.length);
        const selectedColor = availableColors[index];
        newColor = {
          red: selectedColor.red,
          green: selectedColor.green,
          blue: selectedColor.blue
        };
      } else {
        // All palette colors are in use, just pick any
        newColor = getRandomColor(paletteName);
      }
    }

    return { action: 'change', targetIndex: mostSuccessfulIndex, newColor };
  }
}
