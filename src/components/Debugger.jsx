import { useEffect } from 'react'

/**
 * Debugger component for keyboard controls
 * Only rendered when debug mode is enabled
 *
 * Keyboard shortcuts:
 * - 'p': Toggle between palette picker and main view
 * - '/': Toggle control panel visibility
 * - '.': Toggle pin state
 * - 's': Toggle show population
 */
export default function Debugger({
  showPalettePicker,
  setShowPalettePicker,
  isHidden,
  showSidebar,
  scheduleSidebarHide,
  isPinned,
  setIsPinned,
  onShowPopulationChange,
  showPopulation,
}) {
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      switch (e.key) {
        case 'p':
          setShowPalettePicker((prev) => !prev)
          break
        case '/':
          if (isHidden) {
            showSidebar()
          } else {
            scheduleSidebarHide()
          }
          break
        case '.':
          setIsPinned((prev) => !prev)
          break
        case 's':
          onShowPopulationChange(!showPopulation)
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [
    showPalettePicker,
    setShowPalettePicker,
    isHidden,
    showSidebar,
    scheduleSidebarHide,
    isPinned,
    setIsPinned,
    showPopulation,
    onShowPopulationChange,
  ])

  return null // This component doesn't render anything
}
