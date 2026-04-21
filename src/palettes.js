// Color palettes - each palette is an array of {red, green, blue} objects
export const PALETTES = {
  custom: null,  // null means use manual color selection
  forest: [
    {red: 34, green: 139, blue: 34},   // forest green
    {red: 85, green: 107, blue: 47},   // dark olive
    {red: 107, green: 142, blue: 35},  // olive drab
    {red: 46, green: 125, blue: 50},   // medium forest
    {red: 139, green: 69, blue: 19},   // saddle brown
    {red: 160, green: 82, blue: 45}    // sienna
  ],
  ocean: [
    {red: 0, green: 105, blue: 148},   // deep ocean
    {red: 64, green: 224, blue: 208},  // turquoise
    {red: 0, green: 139, blue: 139},   // dark cyan
    {red: 72, green: 209, blue: 204},  // medium turquoise
    {red: 32, green: 178, blue: 170},  // light sea green
    {red: 70, green: 130, blue: 180}   // steel blue
  ],
  sunset: [
    {red: 255, green: 99, blue: 71},   // tomato
    {red: 255, green: 140, blue: 0},   // dark orange
    {red: 255, green: 69, blue: 0},    // orange red
    {red: 220, green: 20, blue: 60},   // crimson
    {red: 186, green: 85, blue: 211},  // medium orchid
    {red: 147, green: 112, blue: 219}  // medium purple
  ],
  neon: [
    {red: 255, green: 0, blue: 255},   // magenta
    {red: 0, green: 255, blue: 255},   // cyan
    {red: 255, green: 255, blue: 0},   // yellow
    {red: 57, green: 255, blue: 20},   // neon green
    {red: 255, green: 20, blue: 147},  // deep pink
    {red: 138, green: 43, blue: 226}   // blue violet
  ],
  pastel: [
    {red: 255, green: 182, blue: 193}, // light pink
    {red: 176, green: 224, blue: 230}, // powder blue
    {red: 221, green: 160, blue: 221}, // plum
    {red: 255, green: 218, blue: 185}, // peach puff
    {red: 152, green: 251, blue: 152}, // pale green
    {red: 216, green: 191, blue: 216}  // thistle
  ],
  monochrome: [
    {red: 50, green: 50, blue: 50},    // dark gray
    {red: 100, green: 100, blue: 100}, // gray
    {red: 150, green: 150, blue: 150}, // light gray
    {red: 75, green: 75, blue: 75},    // medium dark
    {red: 125, green: 125, blue: 125}, // medium light
    {red: 175, green: 175, blue: 175}  // very light
  ],
  fire: [
    {red: 255, green: 0, blue: 0},     // red
    {red: 255, green: 69, blue: 0},    // orange red
    {red: 255, green: 140, blue: 0},   // dark orange
    {red: 255, green: 165, blue: 0},   // orange
    {red: 255, green: 215, blue: 0},   // gold
    {red: 184, green: 134, blue: 11}   // dark goldenrod
  ],
  cyberpunk: [
    {red: 255, green: 0, blue: 110},   // hot pink
    {red: 0, green: 255, blue: 255},   // cyan
    {red: 138, green: 43, blue: 226},  // blue violet
    {red: 255, green: 20, blue: 147},  // deep pink
    {red: 0, green: 191, blue: 255},   // deep sky blue
    {red: 186, green: 85, blue: 211}   // medium orchid
  ],
  queenOfHearts: [
    {red: 201, green: 0, blue: 0},     // Brick ember
    {red: 255, green: 71, blue: 71},   // Strawberry red
    {red: 82, green: 0, blue: 0},      // Black cherry
    {red: 255, green: 194, blue: 194}, // Cotton rose
    {red: 255, green: 255, blue: 255}, // white
    {red: 255, green: 0, blue: 110},   // hot pink
  ],
  verdant: [
    {red: 34, green: 139, blue: 34},   // forest green
    {red: 50, green: 205, blue: 50},   // lime green
    {red: 124, green: 252, blue: 0},   // lawn green
    {red: 144, green: 238, blue: 144}, // light green
    {red: 60, green: 179, blue: 113},  // medium sea green
    {red: 46, green: 125, blue: 50}    // leafy green
  ]
};

export function getRandomPaletteName() {
  const paletteNames = Object.keys(PALETTES);
  const nonCustomPalettes = paletteNames.filter(name => name !== 'custom');
  const randomIndex = Math.floor(Math.random() * nonCustomPalettes.length);
  return nonCustomPalettes[randomIndex];
}
