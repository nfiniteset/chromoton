import { useState, useCallback, Children, cloneElement } from 'react'
import { cn } from '../../lib/utils'

export default function NavStack({ activeView, children, className = '' }) {
  const [viewHeights, setViewHeights] = useState({})

  const handleHeightChange = useCallback((id, height) => {
    setViewHeights((prev) => {
      if (prev[id] === height) return prev
      return { ...prev, [id]: height }
    })
  }, [])

  const childArray = Children.toArray(children)
  const activeIndex = Math.max(
    0,
    childArray.findIndex((child) => child.props.id === activeView)
  )
  const activeHeight = viewHeights[activeView]

  return (
    <div
      // overflow-clip, not overflow-hidden: hidden still creates a scroll container,
      // so focusing an element in the offscreen view (e.g. the checked radio when the
      // palette picker opens) scrolls this div sideways and fights the slide transition.
      // clip cannot be scrolled at all.
      className={cn('overflow-clip', className)}
      style={{
        height: activeHeight ? `${activeHeight}px` : 'auto',
        transition: 'height 300ms var(--ease-begin-and-end-on-screen)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: '100%',
          // Views must keep their natural height; the default stretch sizes every
          // view to the tallest one, so scrollHeight measurements all come back
          // equal and the height animation never runs.
          alignItems: 'start',
          transform: `translateX(-${activeIndex * 100}%)`,
          transition: 'transform 300ms var(--ease-begin-and-end-on-screen)',
        }}
      >
        {Children.map(children, (child) =>
          cloneElement(child, {
            isActive: child.props.id === activeView,
            onHeightChange: handleHeightChange,
          })
        )}
      </div>
    </div>
  )
}
