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
import { getThemeForColor as calculateThemeForColor } from '../utils/themeUtils'
import type { Color } from '../models/colorModel'
import type { ColorTheme } from '../utils/themeUtils'

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
    return calculateThemeForColor(color)
  }, [])

  useEffect(() => {
    document.body.style.setProperty(
      '--focus-ring-color',
      contrastColors.borderFocus
    )
  }, [contrastColors.borderFocus])

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
