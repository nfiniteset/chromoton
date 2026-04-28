import { useRef, useEffect, useState, useLayoutEffect } from 'react'
import { cn } from '../../lib/utils'

export default function NavStackView({
  id,
  isActive = false,
  slideFrom = 'left',
  onHeightChange = /** @type {((id: string, height: number) => void) | undefined} */ (
    undefined
  ),
  children,
  className = '',
}) {
  const contentRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [hasMeasured, setHasMeasured] = useState(false)

  // Measure synchronously before first paint so the always-absolute container isn't 0-height.

  useLayoutEffect(() => {
    const el = contentRef.current
    if (el && onHeightChange) onHeightChange(id, el.scrollHeight)
  }, [])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const measure = () => onHeightChange?.(id, el.scrollHeight)
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [id, onHeightChange])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setHasMeasured(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const offscreen =
    slideFrom === 'right' ? 'translateX(100%)' : 'translateX(-100%)'

  const getTransform = () => {
    if (slideFrom === 'right') {
      return hasMeasured && isActive ? 'translateX(0)' : offscreen
    }
    if (!hasMeasured) return 'translateX(0)'
    return isActive ? 'translateX(0)' : offscreen
  }

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute inset-x-0 top-0 transition-all duration-300',
        className
      )}
      inert={!isActive || undefined}
      style={{
        transform: getTransform(),
        opacity: hasMeasured && !isActive ? 0 : 1,
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      {children}
    </div>
  )
}
