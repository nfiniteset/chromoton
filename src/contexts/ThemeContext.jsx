import { createContext, useContext, useRef, useCallback } from 'react'
import { useCanvasContrast } from '../hooks/useCanvasContrast'
import { getThemeForColor as calculateThemeForColor } from '../utils/themeUtils'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const panelRef = useRef(null)
  const contrastColors = useCanvasContrast(panelRef)

  const getThemeForColor = useCallback((color) => {
    return calculateThemeForColor(color)
  }, [])

  return (
    <ThemeContext.Provider
      value={{ contrastColors, panelRef, getThemeForColor }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
