import type { Color } from './models/colorModel'

// Define palette names as a union type
export type PaletteName =
  | 'none'
  | 'aquatic'
  | 'sunset'
  | 'afterglow'
  | 'pastel'
  | 'monochrome'
  | 'queenOfHearts'
  | 'verdant'
  | 'lichen'
  | 'lickable'
  | 'eames'
  | 'baddie'
  | 'rainbow'

// Display names for each palette
export const PALETTE_DISPLAY_NAMES: Record<PaletteName, string> = {
  none: 'Any color',
  aquatic: 'Aquatic',
  sunset: 'Sunset',
  afterglow: 'Afterglow',
  pastel: 'Pastel',
  monochrome: 'Monochrome',
  queenOfHearts: 'Queen of Hearts',
  verdant: 'Verdant',
  lichen: 'Lichen',
  lickable: 'Lickable',
  eames: 'Eames',
  baddie: 'Baddie',
  rainbow: 'Rainbow',
}

// Color palettes - each palette is an array of Color objects, except 'none' which is null
export const PALETTES: Record<PaletteName, Color[] | null> = {
  none: null, // null means use manual color selection
  aquatic: [
    { r: 0, g: 105, b: 148 }, // deep aquatic
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
  afterglow: [
    { r: 254, g: 77, b: 160 }, // hot pink
    { r: 255, g: 157, b: 0 }, // orange
    { r: 136, g: 224, b: 90 }, // lime green
    { r: 174, g: 239, b: 50 }, // yellow-green
    { r: 38, g: 184, b: 191 }, // cyan
    { r: 216, g: 93, b: 218 }, // magenta
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
    { r: 0, g: 0, b: 0 }, // black
    { r: 49, g: 49, b: 49 }, // near black
    { r: 95, g: 95, b: 95 }, // dark gray
    { r: 219, g: 219, b: 219 }, // light gray
    { r: 233, g: 233, b: 233 }, // very light gray
    { r: 255, g: 255, b: 255 }, // white
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
  baddie: [
    { r: 134, g: 255, b: 58 }, // lime green
    { r: 42, g: 30, b: 58 }, // dark purple
    { r: 176, g: 122, b: 251 }, // violet
    { r: 214, g: 184, b: 254 }, // light lavender
    { r: 80, g: 80, b: 80 }, // dark gray
    { r: 18, g: 18, b: 18 }, // near black
  ],
  eames: [
    { r: 224, g: 67, b: 39 }, // red-orange
    { r: 189, g: 168, b: 0 }, // gold
    { r: 0, g: 145, b: 65 }, // kelly green
    { r: 0, g: 63, b: 121 }, // navy
    { r: 0, g: 0, b: 0 }, // black
    { r: 250, g: 244, b: 214 }, // cream
  ],
  lickable: [
    { r: 215, g: 190, b: 46 }, // golden yellow
    { r: 64, g: 121, b: 71 }, // medium green
    { r: 73, g: 102, b: 150 }, // slate blue
    { r: 186, g: 67, b: 75 }, // crimson
    { r: 89, g: 87, b: 142 }, // purple
    { r: 215, g: 106, b: 54 }, // orange
  ],
  lichen: [
    { r: 169, g: 161, b: 154 }, // stone gray
    { r: 203, g: 205, b: 108 }, // olive
    { r: 228, g: 233, b: 109 }, // yellow-green
    { r: 247, g: 250, b: 179 }, // pale yellow
    { r: 245, g: 195, b: 86 }, // amber
    { r: 234, g: 233, b: 215 }, // cream
  ],
  rainbow: [
    { r: 255, g: 0, b: 0 }, // vivid red
    { r: 255, g: 127, b: 0 }, // orange
    { r: 255, g: 255, b: 0 }, // yellow
    { r: 0, g: 200, b: 0 }, // green
    { r: 0, g: 0, b: 255 }, // blue
    { r: 148, g: 0, b: 211 }, // violet
  ],
} as const

// Non-custom palette names for random selection
const NON_CUSTOM_PALETTES: Exclude<PaletteName, 'none'>[] = [
  'aquatic',
  'sunset',
  'afterglow',
  'pastel',
  'monochrome',
  'queenOfHearts',
  'verdant',
  'lichen',
  'lickable',
  'eames',
  'baddie',
  'rainbow',
]

export function getRandomPaletteName(): Exclude<PaletteName, 'none'> {
  const randomIndex = Math.floor(Math.random() * NON_CUSTOM_PALETTES.length)
  return NON_CUSTOM_PALETTES[randomIndex]
}
