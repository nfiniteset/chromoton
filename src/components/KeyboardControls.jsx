import { useEffect } from 'react'

/**
 * Keyboard shortcuts:
 * - 'Escape': Back to main panel (if palette picker open), or hide control panel
 * - 'p': Toggle palette picker open/closed
 * - 's': Toggle show population
 */
export default function KeyboardControls({
  showPalettePicker,
  setShowPalettePicker,
  isHidden,
  showPanel,
  hidePanel,
  onShowPopulationChange,
  showPopulation,
}) {
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      if (isHidden) {
        showPanel()
        return
      }

      switch (e.key) {
        case 'Escape':
          if (showPalettePicker) {
            setShowPalettePicker(false)
          } else {
            hidePanel()
          }
          break
        case 'p':
          setShowPalettePicker((prev) => !prev)
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
    showPanel,
    hidePanel,
    showPopulation,
    onShowPopulationChange,
  ])

  return null
}
