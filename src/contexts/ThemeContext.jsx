import { createContext, useContext, useRef } from 'react'
import { useCanvasContrast } from '../hooks/useCanvasContrast'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const panelRef = useRef(null)
  const contrastColors = useCanvasContrast(panelRef)

  return (
    <ThemeContext.Provider value={{ contrastColors, panelRef }}>
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
