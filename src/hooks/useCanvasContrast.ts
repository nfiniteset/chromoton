import { useState, useEffect, useRef, type RefObject } from 'react'
import chroma from 'chroma-js'
import type { Color } from '../models/colorModel'

interface ContrastColors {
  textColor: string
  textColorAlpha: string
  textColorWeak: string
  textColorHeader: string
  textActive: string
  borderColor: string
  borderColorHover: string
  borderFocusColor: string
  sliderThumb: string
  backgroundHover: string
  backgroundActive: string
  backgroundActiveHover: string
}

/**
 * Hook to sample the canvas behind the control panel and calculate
 * appropriate UI colors for sufficient contrast
 */
export function useCanvasContrast(
  panelRef: RefObject<HTMLElement>
): ContrastColors {
  const [colors, setColors] = useState<ContrastColors>(getDefaultColors())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isLightThemeRef = useRef<boolean>(true) // Track current theme to prevent flashing
  const lastColorsRef = useRef<ContrastColors>(getDefaultColors()) // Track last colors to prevent unnecessary updates

  useEffect(() => {
    if (!panelRef?.current) {
      return
    }

    // Update contrast every 100ms
    intervalRef.current = setInterval(() => {
      updateContrast(
        panelRef.current,
        setColors,
        isLightThemeRef,
        lastColorsRef
      )
    }, 100)

    // Initial update
    updateContrast(panelRef.current, setColors, isLightThemeRef, lastColorsRef)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [panelRef])

  return colors
}

function getDefaultColors(): ContrastColors {
  return {
    textColor: '#ffffff',
    textColorAlpha: 'rgba(255, 255, 255, 0.75)',
    textColorWeak: 'rgba(255, 255, 255, 0.45)',
    textColorHeader: 'rgba(255, 255, 255, 0.35)',
    textActive: '#000000',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderColorHover: 'rgba(255, 255, 255, 0.4)',
    borderFocusColor: '#ffffff',
    sliderThumb: '#eee',
    backgroundHover: 'rgba(255, 255, 255, 0.1)',
    backgroundActive: 'rgba(255, 255, 255, 0.5)',
    backgroundActiveHover: 'rgba(255, 255, 255, 0.3)',
  }
}

function updateContrast(
  panel: HTMLElement,
  setColors: (colors: ContrastColors) => void,
  isLightThemeRef: RefObject<boolean>,
  lastColorsRef: RefObject<ContrastColors>
): void {
  if (!panel) {
    return
  }

  const rawColor = sampleCanvasColorBehindPanel(panel)
  if (!rawColor) {
    return
  }

  const calculatedColors = calculateContrastColors(rawColor, isLightThemeRef)

  // Only update if colors have changed significantly
  if (!colorsAreEqual(calculatedColors, lastColorsRef.current)) {
    lastColorsRef.current = calculatedColors
    setColors(calculatedColors)
  }
}

function colorsAreEqual(a: ContrastColors, b: ContrastColors): boolean {
  // Compare all color properties for equality
  return (
    a.textColor === b.textColor &&
    a.textColorAlpha === b.textColorAlpha &&
    a.textColorWeak === b.textColorWeak &&
    a.textColorHeader === b.textColorHeader &&
    a.textActive === b.textActive &&
    a.borderColor === b.borderColor &&
    a.borderColorHover === b.borderColorHover &&
    a.borderFocusColor === b.borderFocusColor &&
    a.sliderThumb === b.sliderThumb &&
    a.backgroundHover === b.backgroundHover &&
    a.backgroundActive === b.backgroundActive &&
    a.backgroundActiveHover === b.backgroundActiveHover
  )
}

function sampleCanvasColorBehindPanel(panel: HTMLElement): Color | null {
  const canvas = document.querySelector<HTMLCanvasElement>('.chromotons')
  if (!canvas) {
    return null
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }
  const canvasRect = canvas.getBoundingClientRect()
  const panelRect = panel.getBoundingClientRect()

  // Calculate scale factor between display size and actual canvas size
  const scaleX = canvas.width / canvasRect.width
  const scaleY = canvas.height / canvasRect.height

  // Calculate sample area in canvas coordinates
  let sampleX = (panelRect.left - canvasRect.left) * scaleX
  let sampleY = (panelRect.top - canvasRect.top) * scaleY
  let sampleWidth = panelRect.width * scaleX
  let sampleHeight = panelRect.height * scaleY

  // Clamp to canvas bounds
  sampleX = Math.max(0, Math.min(sampleX, canvas.width - 1))
  sampleY = Math.max(0, Math.min(sampleY, canvas.height - 1))
  sampleWidth = Math.min(sampleWidth, canvas.width - sampleX)
  sampleHeight = Math.min(sampleHeight, canvas.height - sampleY)

  // Sample 30 points horizontally across the middle of the panel area
  const samplePoints = 30
  let totalR = 0
  let totalG = 0
  let totalB = 0
  let validSamples = 0

  for (let i = 0; i < samplePoints; i++) {
    const x = Math.floor(
      sampleX +
        (sampleWidth / samplePoints) * i +
        sampleWidth / (samplePoints * 2)
    )
    const y = Math.floor(sampleY + sampleHeight / 2)

    try {
      const imageData = ctx.getImageData(x, y, 1, 1)
      const data = imageData.data
      totalR += data[0]
      totalG += data[1]
      totalB += data[2]
      validSamples++
    } catch {
      // Security error or out of bounds - skip this sample
      continue
    }
  }

  if (validSamples === 0) {
    return null
  }

  return {
    r: Math.round(totalR / validSamples),
    g: Math.round(totalG / validSamples),
    b: Math.round(totalB / validSamples),
  }
}

function calculateContrastColors(
  rawColor: Color,
  isLightThemeRef: RefObject<boolean>
): ContrastColors {
  // Apply blur effect (simulated by slight desaturation)
  let color = chroma(rawColor.r, rawColor.g, rawColor.b)

  // Saturate the color (180%)
  const hsl = color.hsl()
  const hue = hsl[0]
  const saturation = hsl[1]

  if (!isNaN(saturation)) {
    const newSaturation = Math.min(1, saturation * 1.8)
    color = chroma.hsl(hue, newSaturation, hsl[2])
  }

  const rgb = color.rgb()

  // Blend with white overlay: rgba(255, 255, 255, 0.08)
  const overlayAlpha = 0.08
  const bgColor = {
    r: Math.round(rgb[0] * (1 - overlayAlpha) + 255 * overlayAlpha),
    g: Math.round(rgb[1] * (1 - overlayAlpha) + 255 * overlayAlpha),
    b: Math.round(rgb[2] * (1 - overlayAlpha) + 255 * overlayAlpha),
  }

  // Calculate contrast with white vs black
  const bgChroma = chroma(bgColor.r, bgColor.g, bgColor.b)
  const contrastWithWhite = chroma.contrast(bgChroma, 'white')
  const contrastWithBlack = chroma.contrast(bgChroma, 'black')

  // Apply hysteresis to prevent flashing between themes
  // Require 55% better contrast before switching themes
  const hysteresisThreshold = 1.25
  const currentlyLight = isLightThemeRef.current ?? true

  let useWhite: boolean
  if (currentlyLight) {
    // Currently light theme - only switch to dark if black contrast is better enough
    useWhite = contrastWithWhite * hysteresisThreshold > contrastWithBlack
  } else {
    // Currently dark theme - only switch to light if white contrast is better enough
    useWhite = contrastWithWhite > contrastWithBlack * hysteresisThreshold
  }

  // Update the ref with the new theme choice
  if (isLightThemeRef.current !== undefined) {
    isLightThemeRef.current = useWhite
  }

  // Generate colors with the sampled hue
  // If hue is NaN (grayscale), fall back to neutral colors
  const hasHue = !isNaN(hue) && saturation > 0.05

  if (useWhite) {
    // Light scheme with sampled hue
    const textColor = hasHue ? chroma.hsl(hue, 0.8, 0.92).hex() : '#ffffff'
    const textColorAlpha = hasHue
      ? chroma.hsl(hue, 0.75, 0.9).alpha(0.75).css()
      : 'rgba(255, 255, 255, 0.75)'
    const textColorWeak = hasHue
      ? chroma.hsl(hue, 0.7, 0.88).alpha(0.65).css()
      : 'rgba(255, 255, 255, 0.45)'
    const textColorHeader = hasHue
      ? chroma.hsl(hue, 0.65, 0.86).alpha(0.35).css()
      : 'rgba(255, 255, 255, 0.35)'
    const textActive = hasHue ? chroma.hsl(hue, 0.8, 0.18).hex() : '#000000'
    const borderColor = hasHue
      ? chroma.hsl(hue, 0.85, 0.86).alpha(0.4).css()
      : 'rgba(255, 255, 255, 0.15)'
    const borderColorHover = hasHue
      ? chroma.hsl(hue, 0.9, 0.88).alpha(0.7).css()
      : 'rgba(255, 255, 255, 0.4)'
    const sliderThumb = hasHue ? chroma.hsl(hue, 0.8, 0.88).hex() : '#eee'
    const backgroundHover = hasHue
      ? chroma.hsl(hue, 0.75, 0.9).alpha(0.2).css()
      : 'rgba(255, 255, 255, 0.1)'
    const backgroundActive = hasHue
      ? chroma.hsl(hue, 0.8, 0.92).alpha(0.6).css()
      : 'rgba(255, 255, 255, 0.5)'
    const backgroundActiveHover = hasHue
      ? chroma.hsl(hue, 0.77, 0.91).alpha(0.4).css()
      : 'rgba(255, 255, 255, 0.3)'

    return {
      textColor,
      textColorAlpha,
      textColorWeak,
      textColorHeader,
      textActive,
      borderColor,
      borderColorHover,
      borderFocusColor: textColor,
      sliderThumb,
      backgroundHover,
      backgroundActive,
      backgroundActiveHover,
    }
  } else {
    // Dark scheme with sampled hue
    const textColor = hasHue ? chroma.hsl(hue, 0.8, 0.18).hex() : '#000000'
    const textColorAlpha = hasHue
      ? chroma.hsl(hue, 0.75, 0.2).alpha(0.75).css()
      : 'rgba(0, 0, 0, 0.75)'
    const textColorWeak = hasHue
      ? chroma.hsl(hue, 0.7, 0.24).alpha(0.65).css()
      : 'rgba(0, 0, 0, 0.45)'
    const textColorHeader = hasHue
      ? chroma.hsl(hue, 0.65, 0.26).alpha(0.35).css()
      : 'rgba(0, 0, 0, 0.35)'
    const textActive = hasHue ? chroma.hsl(hue, 0.8, 0.92).hex() : '#ffffff'
    const borderColor = hasHue
      ? chroma.hsl(hue, 0.85, 0.22).alpha(0.4).css()
      : 'rgba(0, 0, 0, 0.15)'
    const borderColorHover = hasHue
      ? chroma.hsl(hue, 0.9, 0.26).alpha(0.7).css()
      : 'rgba(0, 0, 0, 0.4)'
    const sliderThumb = hasHue ? chroma.hsl(hue, 0.8, 0.24).hex() : '#222'
    const backgroundHover = hasHue
      ? chroma.hsl(hue, 0.75, 0.2).alpha(0.2).css()
      : 'rgba(0, 0, 0, 0.1)'
    const backgroundActive = hasHue
      ? chroma.hsl(hue, 0.8, 0.18).alpha(0.6).css()
      : 'rgba(0, 0, 0, 0.5)'
    const backgroundActiveHover = hasHue
      ? chroma.hsl(hue, 0.77, 0.19).alpha(0.4).css()
      : 'rgba(0, 0, 0, 0.3)'

    return {
      textColor,
      textColorAlpha,
      textColorWeak,
      textColorHeader,
      textActive,
      borderColor,
      borderColorHover,
      borderFocusColor: textColor,
      sliderThumb,
      backgroundHover,
      backgroundActive,
      backgroundActiveHover,
    }
  }
}
