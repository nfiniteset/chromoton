import { useRef, useEffect, useState } from 'react'
import { cn } from '../lib/utils'

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
  const [hasMeasured, setHasMeasured] = useState(false)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const measureHeight = () => {
      if (onHeightChange) onHeightChange(id, el.scrollHeight)
      if (!hasMeasured) {
        requestAnimationFrame(() => {
          setHasMeasured(true)
        })
      }
    }

    measureHeight()

    const resizeObserver = new ResizeObserver(measureHeight)
    resizeObserver.observe(el)

    const handleTransitionEnd = () => {
      measureHeight()
    }

    el.addEventListener('transitionend', handleTransitionEnd)

    return () => {
      resizeObserver.disconnect()
      el.removeEventListener('transitionend', handleTransitionEnd)
    }
  }, [id, onHeightChange, children, hasMeasured])

  const getTransform = () => {
    if (id === 'palette-picker') {
      if (!hasMeasured) return 'translateX(100%)'
      return isActive ? 'translateX(0)' : 'translateX(100%)'
    }
    if (!hasMeasured) return 'translateX(0)'
    return isActive ? 'translateX(0)' : 'translateX(-100%)'
  }

  return (
    <div
      ref={contentRef}
      className={cn('transition-all duration-300', className)}
      inert={!isActive || undefined}
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
