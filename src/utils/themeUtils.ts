import chroma from 'chroma-js'
import type { Color } from '../models/colorModel'

interface ColorTheme {
  textColor: string
  iconColor: string
  backgroundHover: string
}

/**
 * Generate a theme tinted to and contrasting with a target color
 *
 * This function calculates appropriate UI colors for elements that need
 * to be visible against a colored background (like icon buttons on color swatches).
 *
 * @param color - The target color to generate theme for
 * @returns Theme colors optimized for contrast against the target color
 */
export function getThemeForColor(color: Color): ColorTheme {
  const chromaColor = chroma(color.r, color.g, color.b)

  // Calculate luminance to determine if we need light or dark text
  const luminance = chromaColor.luminance()

  // Extract hue and saturation from the color
  const hsl = chromaColor.hsl()
  const hue = hsl[0]
  const saturation = hsl[1]
  const hasHue = !isNaN(hue) && saturation > 0.05

  if (luminance > 0.5) {
    // Light background - use dark theme
    const textColor = hasHue ? chroma.hsl(hue, 0.8, 0.18).hex() : '#000000'
    const iconColor = hasHue
      ? chroma.hsl(hue, 0.75, 0.2).alpha(0.7).css()
      : 'rgba(0, 0, 0, 0.7)'
    const backgroundHover = hasHue
      ? chroma.hsl(hue, 0.75, 0.2).alpha(0.15).css()
      : 'rgba(0, 0, 0, 0.1)'

    return {
      textColor,
      iconColor,
      backgroundHover,
    }
  } else {
    // Dark background - use light theme
    const textColor = hasHue ? chroma.hsl(hue, 0.8, 0.92).hex() : '#ffffff'
    const iconColor = hasHue
      ? chroma.hsl(hue, 0.75, 0.9).alpha(0.7).css()
      : 'rgba(255, 255, 255, 0.7)'
    const backgroundHover = hasHue
      ? chroma.hsl(hue, 0.75, 0.9).alpha(0.15).css()
      : 'rgba(255, 255, 255, 0.1)'

    return {
      textColor,
      iconColor,
      backgroundHover,
    }
  }
}
