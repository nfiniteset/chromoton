import { useState, Children, cloneElement, useEffect } from 'react'

export default function NavStack({ activeView, children }) {
  const [viewHeights, setViewHeights] = useState({})
  const [renderedViews, setRenderedViews] = useState(new Set([activeView]))

  const handleHeightChange = (id, height) => {
    setViewHeights((prev) => {
      if (prev[id] === height) return prev
      return { ...prev, [id]: height }
    })
  }

  // When activeView changes, add it to renderedViews if not already there
  useEffect(() => {
    setRenderedViews((prev) => {
      if (prev.has(activeView)) return prev
      return new Set([...prev, activeView])
    })
  }, [activeView])

  // Get the height of the currently active view
  const activeHeight = viewHeights[activeView]

  return (
    <div
      className="relative overflow-hidden transition-all duration-300"
      style={{
        height: activeHeight ? `${activeHeight}px` : 'auto',
      }}
    >
      {Children.map(children, (child) => {
        // Only render views that have been active at least once
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
