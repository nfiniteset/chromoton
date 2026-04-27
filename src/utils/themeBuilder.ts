import chroma from 'chroma-js'
import type { Color } from '../models/colorModel'
import { bestPolarity, type Polarity } from './contrastPolarity'

export interface ContrastColors {
  text: string
  textAlpha: string
  textWeak: string
  textHeader: string
  textActive: string
  icon: string
  iconActive: string
  border: string
  borderHover: string
  borderFocus: string
  sliderThumb: string
  backgroundHover: string
  backgroundActive: string
  backgroundActiveHover: string
}

export interface ColorTheme {
  text: string
  textWeak: string
  icon: string
  border: string
  backgroundHover: string
}

export function defaultContrastColors(): ContrastColors {
  return {
    text: '#ffffff',
    textAlpha: 'rgba(255, 255, 255, 0.75)',
    textWeak: 'rgba(255, 255, 255, 0.45)',
    textHeader: 'rgba(255, 255, 255, 0.35)',
    textActive: '#000000',
    icon: '#ffffff',
    iconActive: '#000000',
    border: 'rgba(255, 255, 255, 0.18)',
    borderHover: 'rgba(255, 255, 255, 0.4)',
    borderFocus: '#ffffff',
    sliderThumb: '#eee',
    backgroundHover: 'rgba(255, 255, 255, 0.1)',
    backgroundActive: 'rgba(255, 255, 255, 0.5)',
    backgroundActiveHover: 'rgba(255, 255, 255, 0.3)',
  }
}

/**
 * Simulates the visual effect of the panel's CSS backdrop on a raw canvas
 * sample: 180% saturation boost + 8% white overlay.
 * Used to get the effective background color for polarity decisions.
 */
export function toEffectiveBackground(raw: Color): Color {
  let color = chroma(raw.r, raw.g, raw.b)
  const [, saturation, lightness] = color.hsl()
  const hue = color.hsl()[0]

  if (!isNaN(saturation)) {
    color = chroma.hsl(hue, Math.min(1, saturation * 1.8), lightness)
  }

  const [r, g, b] = color.rgb()
  const a = 0.08
  return {
    r: Math.round(r * (1 - a) + 255 * a),
    g: Math.round(g * (1 - a) + 255 * a),
    b: Math.round(b * (1 - a) + 255 * a),
  }
}

/**
 * Builds the full panel theme from a raw canvas sample and a pre-decided
 * polarity. Hue is extracted from the raw color; polarity controls whether
 * the token set is light or dark.
 */
export function buildPanelTheme(
  raw: Color,
  polarity: Polarity
): ContrastColors {
  const [hue, saturation] = chroma(raw.r, raw.g, raw.b).hsl()
  const hasHue = !isNaN(hue) && saturation > 0.05

  if (polarity === 'light') {
    const text = hasHue ? chroma.hsl(hue, 0.8, 0.92).hex() : '#ffffff'
    const textActive = hasHue ? chroma.hsl(hue, 0.8, 0.18).hex() : '#000000'
    return {
      text,
      textAlpha: hasHue
        ? chroma.hsl(hue, 0.75, 0.9).alpha(0.75).css()
        : 'rgba(255, 255, 255, 0.75)',
      textWeak: hasHue
        ? chroma.hsl(hue, 0.7, 0.88).alpha(0.65).css()
        : 'rgba(255, 255, 255, 0.45)',
      textHeader: hasHue
        ? chroma.hsl(hue, 0.65, 0.86).alpha(0.35).css()
        : 'rgba(255, 255, 255, 0.35)',
      textActive,
      icon: text,
      iconActive: textActive,
      border: hasHue
        ? chroma.hsl(hue, 0.85, 0.86).alpha(0.4).css()
        : 'rgba(255, 255, 255, 0.15)',
      borderHover: hasHue
        ? chroma.hsl(hue, 0.9, 0.88).alpha(0.7).css()
        : 'rgba(255, 255, 255, 0.4)',
      borderFocus: text,
      sliderThumb: hasHue ? chroma.hsl(hue, 0.8, 0.88).hex() : '#eee',
      backgroundHover: hasHue
        ? chroma.hsl(hue, 0.75, 0.9).alpha(0.2).css()
        : 'rgba(255, 255, 255, 0.1)',
      backgroundActive: hasHue
        ? chroma.hsl(hue, 0.8, 0.92).alpha(0.6).css()
        : 'rgba(255, 255, 255, 0.5)',
      backgroundActiveHover: hasHue
        ? chroma.hsl(hue, 0.77, 0.91).alpha(0.4).css()
        : 'rgba(255, 255, 255, 0.3)',
    }
  } else {
    const text = hasHue ? chroma.hsl(hue, 0.8, 0.18).hex() : '#000000'
    const textActive = hasHue ? chroma.hsl(hue, 0.8, 0.92).hex() : '#ffffff'
    return {
      text,
      textAlpha: hasHue
        ? chroma.hsl(hue, 0.75, 0.2).alpha(0.75).css()
        : 'rgba(0, 0, 0, 0.75)',
      textWeak: hasHue
        ? chroma.hsl(hue, 0.7, 0.24).alpha(0.65).css()
        : 'rgba(0, 0, 0, 0.45)',
      textHeader: hasHue
        ? chroma.hsl(hue, 0.65, 0.26).alpha(0.35).css()
        : 'rgba(0, 0, 0, 0.35)',
      textActive,
      icon: text,
      iconActive: textActive,
      border: hasHue
        ? chroma.hsl(hue, 0.85, 0.22).alpha(0.4).css()
        : 'rgba(0, 0, 0, 0.15)',
      borderHover: hasHue
        ? chroma.hsl(hue, 0.9, 0.26).alpha(0.7).css()
        : 'rgba(0, 0, 0, 0.4)',
      borderFocus: text,
      sliderThumb: hasHue ? chroma.hsl(hue, 0.8, 0.24).hex() : '#222',
      backgroundHover: hasHue
        ? chroma.hsl(hue, 0.75, 0.2).alpha(0.2).css()
        : 'rgba(0, 0, 0, 0.1)',
      backgroundActive: hasHue
        ? chroma.hsl(hue, 0.8, 0.18).alpha(0.6).css()
        : 'rgba(0, 0, 0, 0.5)',
      backgroundActiveHover: hasHue
        ? chroma.hsl(hue, 0.77, 0.19).alpha(0.4).css()
        : 'rgba(0, 0, 0, 0.3)',
    }
  }
}

/**
 * Builds a minimal theme for UI elements rendered on top of a specific color
 * (e.g. icon buttons inside a color swatch). Polarity is determined
 * automatically from the color's luminance.
 */
export function buildSwatchTheme(color: Color): ColorTheme {
  const [hue, saturation] = chroma(color.r, color.g, color.b).hsl()
  const hasHue = !isNaN(hue) && saturation > 0.05
  const polarity = bestPolarity(color)

  if (polarity === 'dark') {
    return {
      text: hasHue ? chroma.hsl(hue, 0.8, 0.18).hex() : '#000000',
      textWeak: hasHue
        ? chroma.hsl(hue, 0.7, 0.24).alpha(0.65).css()
        : 'rgba(0, 0, 0, 0.45)',
      icon: hasHue
        ? chroma.hsl(hue, 0.8, 0.15).alpha(0.85).css()
        : 'rgba(0, 0, 0, 0.85)',
      border: hasHue
        ? chroma.hsl(hue, 0.7, 0.35).alpha(0.6).css()
        : 'rgba(0, 0, 0, 0.5)',
      backgroundHover: hasHue
        ? chroma.hsl(hue, 0.75, 0.2).alpha(0.15).css()
        : 'rgba(0, 0, 0, 0.1)',
    }
  } else {
    return {
      text: hasHue ? chroma.hsl(hue, 0.8, 0.92).hex() : '#ffffff',
      textWeak: hasHue
        ? chroma.hsl(hue, 0.7, 0.88).alpha(0.65).css()
        : 'rgba(255, 255, 255, 0.45)',
      icon: hasHue
        ? chroma.hsl(hue, 0.8, 0.95).alpha(0.85).css()
        : 'rgba(255, 255, 255, 0.85)',
      border: hasHue
        ? chroma.hsl(hue, 0.7, 0.75).alpha(0.6).css()
        : 'rgba(255, 255, 255, 0.5)',
      backgroundHover: hasHue
        ? chroma.hsl(hue, 0.75, 0.9).alpha(0.15).css()
        : 'rgba(255, 255, 255, 0.1)',
    }
  }
}
