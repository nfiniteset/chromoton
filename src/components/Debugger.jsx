import { useEffect } from 'react'

/**
 * Debugger component for keyboard controls
 * Only rendered when debug mode is enabled
 *
 * Keyboard shortcuts:
 * - 'a': Toggle advanced controls
 * - 'p': Toggle between palette picker and main view
 * - '/': Toggle control panel visibility
 * - '.': Toggle pin state
 */
export default function Debugger({
  showAdvanced,
  setShowAdvanced,
  showPalettePicker,
  setShowPalettePicker,
  isHidden,
  showSidebar,
  scheduleSidebarHide,
  isPinned,
  setIsPinned,
}) {
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      switch (e.key) {
        case 'a':
          setShowAdvanced((prev) => !prev)
          break
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
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [
    showAdvanced,
    setShowAdvanced,
    showPalettePicker,
    setShowPalettePicker,
    isHidden,
    showSidebar,
    scheduleSidebarHide,
    isPinned,
    setIsPinned,
  ])

  return null // This component doesn't render anything
}
