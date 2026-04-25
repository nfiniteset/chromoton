import { useRef, useEffect, useState } from 'react'

export default function NavStackView({ id, isActive, onHeightChange, children }) {
  const contentRef = useRef(null)
  const [hasMeasured, setHasMeasured] = useState(false)

  // Measure and report natural height whenever content changes or becomes active
  useEffect(() => {
    if (!contentRef.current) return

    const measureHeight = () => {
      const height = contentRef.current.scrollHeight
      onHeightChange?.(id, height)
      // Once we've measured, we can start animating
      if (!hasMeasured) {
        // Small delay to allow the height to be set before animations start
        requestAnimationFrame(() => {
          setHasMeasured(true)
        })
      }
    }

    // Initial measurement
    measureHeight()

    // Re-measure on window resize
    const resizeObserver = new ResizeObserver(measureHeight)
    resizeObserver.observe(contentRef.current)

    // Also listen for transitionend events to catch CSS transitions completing
    const handleTransitionEnd = () => {
      measureHeight()
    }

    contentRef.current.addEventListener('transitionend', handleTransitionEnd)

    return () => {
      resizeObserver.disconnect()
      contentRef.current?.removeEventListener('transitionend', handleTransitionEnd)
    }
  }, [id, onHeightChange, children, hasMeasured])

  // Determine transform based on view type
  const getTransform = () => {
    // Palette picker slides from right
    if (id === 'palette-picker') {
      // Start off-screen right even before measurement
      if (!hasMeasured) return 'translateX(100%)'
      return isActive ? 'translateX(0)' : 'translateX(100%)'
    }

    // Main view starts and stays in place until measured
    if (!hasMeasured) return 'translateX(0)'
    return isActive ? 'translateX(0)' : 'translateX(-100%)'
  }

  return (
    <div
      ref={contentRef}
      className="transition-all duration-300"
      style={{
        position: hasMeasured ? 'absolute' : 'relative',
        left: hasMeasured ? 0 : undefined,
        right: hasMeasured ? 0 : undefined,
        top: hasMeasured ? 0 : undefined,
        transform: getTransform(),
        opacity: hasMeasured && !isActive ? 0 : 1,
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      {children}
    </div>
  )
}
