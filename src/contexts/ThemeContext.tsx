import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  useCanvasContrast,
  type ContrastColors,
} from '../hooks/useCanvasContrast'
import { buildSwatchTheme, type ColorTheme } from '../utils/themeBuilder'
import type { Color } from '../models/colorModel'

interface ThemeContextValue {
  contrastColors: ContrastColors
  panelRef: RefObject<HTMLDivElement | null>
  getThemeForColor: (color: Color) => ColorTheme
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const contrastColors = useCanvasContrast(panelRef)

  const getThemeForColor = useCallback((color: Color) => {
    return buildSwatchTheme(color)
  }, [])

  useEffect(() => {
    const body = document.body
    body.style.setProperty('--ct-text', contrastColors.text)
    body.style.setProperty('--ct-text-weak', contrastColors.textWeak)
    body.style.setProperty('--ct-text-active', contrastColors.textActive)
    body.style.setProperty('--ct-icon', contrastColors.icon)
    body.style.setProperty('--ct-border', contrastColors.border)
    body.style.setProperty('--ct-border-hover', contrastColors.borderHover)
    body.style.setProperty('--ct-border-focus', contrastColors.borderFocus)
    body.style.setProperty('--ct-slider-thumb', contrastColors.sliderThumb)
    body.style.setProperty('--ct-bg-hover', contrastColors.backgroundHover)
    body.style.setProperty('--ct-bg-active', contrastColors.backgroundActive)
    body.style.setProperty(
      '--ct-bg-active-hover',
      contrastColors.backgroundActiveHover
    )
  }, [contrastColors])

  return (
    <ThemeContext.Provider
      value={{ contrastColors, panelRef, getThemeForColor }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
