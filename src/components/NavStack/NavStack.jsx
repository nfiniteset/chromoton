import { useState, Children, cloneElement } from 'react'
import { cn } from '../../lib/utils'

export default function NavStack({ activeView, children, className = '' }) {
  const [viewHeights, setViewHeights] = useState({})

  const handleHeightChange = (id, height) => {
    setViewHeights((prev) => {
      if (prev[id] === height) return prev
      return { ...prev, [id]: height }
    })
  }

  const activeHeight = viewHeights[activeView]

  return (
    <div
      className={cn(
        'relative overflow-hidden transition-[height] duration-300',
        className
      )}
      style={{
        height: activeHeight ? `${activeHeight}px` : 'auto',
      }}
    >
      {Children.map(children, (child) =>
        cloneElement(child, {
          isActive: child.props.id === activeView,
          onHeightChange: handleHeightChange,
        })
      )}
    </div>
  )
}
