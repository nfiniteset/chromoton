import { useEffect } from 'react'

/**
 * Debugger component for keyboard controls
 * Only rendered when debug mode is enabled
 *
 * Keyboard shortcuts:
 * - 'p': Toggle between palette picker and main view
 * - '/': Toggle control panel visibility
 * - 's': Toggle show population
 */
export default function Debugger({
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

      switch (e.key) {
        case 'p':
          setShowPalettePicker((prev) => !prev)
          break
        case '/':
          if (isHidden) {
            showPanel()
          } else {
            hidePanel()
          }
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
