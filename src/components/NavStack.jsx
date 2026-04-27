import { useState, Children, cloneElement, useEffect } from 'react'
import { cn } from '../lib/utils'

export default function NavStack({ activeView, children, className = '' }) {
  const [viewHeights, setViewHeights] = useState({})
  const [renderedViews, setRenderedViews] = useState(new Set([activeView]))

  const handleHeightChange = (id, height) => {
    setViewHeights((prev) => {
      if (prev[id] === height) return prev
      return { ...prev, [id]: height }
    })
  }

  useEffect(() => {
    // The `return prev` guard prevents cascading renders when the view is already tracked.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRenderedViews((prev) => {
      if (prev.has(activeView)) return prev
      return new Set([...prev, activeView])
    })
  }, [activeView])

  const activeHeight = viewHeights[activeView]

  return (
    <div
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        className
      )}
      style={{
        height: activeHeight ? `${activeHeight}px` : 'auto',
      }}
    >
      {Children.map(children, (child) => {
        if (!renderedViews.has(child.props.id)) {
          return null
        }

        return cloneElement(child, {
          isActive: child.props.id === activeView,
          onHeightChange: handleHeightChange,
        })
      })}
    </div>
  )
}
