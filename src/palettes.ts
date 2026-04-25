import type { Color } from './models/colorModel'

// Define palette names as a union type
export type PaletteName =
  | 'none'
  | 'forest'
  | 'ocean'
  | 'sunset'
  | 'neon'
  | 'pastel'
  | 'monochrome'
  | 'fire'
  | 'cyberpunk'
  | 'queenOfHearts'
  | 'verdant'

// Display names for each palette
export const PALETTE_DISPLAY_NAMES: Record<PaletteName, string> = {
  none: 'Any color',
  forest: 'Forest',
  ocean: 'Ocean',
  sunset: 'Sunset',
  neon: 'Neon',
  pastel: 'Pastel',
  monochrome: 'Monochrome',
  fire: 'Fire',
  cyberpunk: 'Cyberpunk',
  queenOfHearts: 'Queen of Hearts',
  verdant: 'Verdant',
}

// Color palettes - each palette is an array of Color objects, except 'none' which is null
export const PALETTES: Record<PaletteName, Color[] | null> = {
  none: null, // null means use manual color selection
  forest: [
    { r: 34, g: 139, b: 34 }, // forest green
    { r: 85, g: 107, b: 47 }, // dark olive
    { r: 107, g: 142, b: 35 }, // olive drab
    { r: 46, g: 125, b: 50 }, // medium forest
    { r: 139, g: 69, b: 19 }, // saddle brown
    { r: 160, g: 82, b: 45 }, // sienna
  ],
  ocean: [
    { r: 0, g: 105, b: 148 }, // deep ocean
    { r: 64, g: 224, b: 208 }, // turquoise
    { r: 0, g: 139, b: 139 }, // dark cyan
    { r: 72, g: 209, b: 204 }, // medium turquoise
    { r: 32, g: 178, b: 170 }, // light sea green
    { r: 70, g: 130, b: 180 }, // steel blue
  ],
  sunset: [
    { r: 255, g: 99, b: 71 }, // tomato
    { r: 255, g: 140, b: 0 }, // dark orange
    { r: 255, g: 69, b: 0 }, // orange red
    { r: 220, g: 20, b: 60 }, // crimson
    { r: 186, g: 85, b: 211 }, // medium orchid
    { r: 147, g: 112, b: 219 }, // medium purple
  ],
  neon: [
    { r: 255, g: 0, b: 255 }, // magenta
    { r: 0, g: 255, b: 255 }, // cyan
    { r: 255, g: 255, b: 0 }, // yellow
    { r: 57, g: 255, b: 20 }, // neon green
    { r: 255, g: 20, b: 147 }, // deep pink
    { r: 138, g: 43, b: 226 }, // blue violet
  ],
  pastel: [
    { r: 255, g: 182, b: 193 }, // light pink
    { r: 176, g: 224, b: 230 }, // powder blue
    { r: 221, g: 160, b: 221 }, // plum
    { r: 255, g: 218, b: 185 }, // peach puff
    { r: 152, g: 251, b: 152 }, // pale green
    { r: 216, g: 191, b: 216 }, // thistle
  ],
  monochrome: [
    { r: 50, g: 50, b: 50 }, // dark gray
    { r: 100, g: 100, b: 100 }, // gray
    { r: 150, g: 150, b: 150 }, // light gray
    { r: 75, g: 75, b: 75 }, // medium dark
    { r: 125, g: 125, b: 125 }, // medium light
    { r: 175, g: 175, b: 175 }, // very light
  ],
  fire: [
    { r: 255, g: 0, b: 0 }, // red
    { r: 255, g: 69, b: 0 }, // orange red
    { r: 255, g: 140, b: 0 }, // dark orange
    { r: 255, g: 165, b: 0 }, // orange
    { r: 255, g: 215, b: 0 }, // gold
    { r: 184, g: 134, b: 11 }, // dark goldenrod
  ],
  cyberpunk: [
    { r: 255, g: 0, b: 110 }, // hot pink
    { r: 0, g: 255, b: 255 }, // cyan
    { r: 138, g: 43, b: 226 }, // blue violet
    { r: 255, g: 20, b: 147 }, // deep pink
    { r: 0, g: 191, b: 255 }, // deep sky blue
    { r: 186, g: 85, b: 211 }, // medium orchid
  ],
  queenOfHearts: [
    { r: 201, g: 0, b: 0 }, // Brick ember
    { r: 255, g: 71, b: 71 }, // Strawberry red
    { r: 82, g: 0, b: 0 }, // Black cherry
    { r: 255, g: 194, b: 194 }, // Cotton rose
    { r: 255, g: 255, b: 255 }, // white
    { r: 255, g: 0, b: 110 }, // hot pink
  ],
  verdant: [
    { r: 34, g: 139, b: 34 }, // forest green
    { r: 50, g: 205, b: 50 }, // lime green
    { r: 124, g: 252, b: 0 }, // lawn green
    { r: 144, g: 238, b: 144 }, // light green
    { r: 60, g: 179, b: 113 }, // medium sea green
    { r: 46, g: 125, b: 50 }, // leafy green
  ],
} as const

// Non-custom palette names for random selection
const NON_CUSTOM_PALETTES: Exclude<PaletteName, 'none'>[] = [
  'forest',
  'ocean',
  'sunset',
  'neon',
  'pastel',
  'monochrome',
  'fire',
  'cyberpunk',
  'queenOfHearts',
  'verdant',
]

export function getRandomPaletteName(): Exclude<PaletteName, 'none'> {
  const randomIndex = Math.floor(Math.random() * NON_CUSTOM_PALETTES.length)
  return NON_CUSTOM_PALETTES[randomIndex]
}
