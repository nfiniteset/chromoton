import { useRef, useEffect, useLayoutEffect } from 'react'
import { cn } from '../../lib/utils'

export default function NavStackView({
  id,
  isActive = false,
  onHeightChange = /** @type {((id: string, height: number) => void) | undefined} */ (
    undefined
  ),
  children,
  className = '',
}) {
  const contentRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  // Re-measure synchronously whenever isActive changes so the correct height is committed
  // to NavStack state before the CSS transition starts. Without this, the initial measurement
  // happens while the view is inert and may not match the live layout, causing the height
  // transition to restart mid-animation and appear to vibrate.
  useLayoutEffect(() => {
    const el = contentRef.current
    if (el && onHeightChange) onHeightChange(id, el.scrollHeight)
  }, [isActive])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const measure = () => onHeightChange?.(id, el.scrollHeight)
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [id, onHeightChange])

  return (
    <div
      ref={contentRef}
      className={cn(className)}
      inert={!isActive || undefined}
    >
      {children}
    </div>
  )
}
