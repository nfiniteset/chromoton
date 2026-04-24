import { useEffect, useRef } from 'react'
import '../chromoton.js'

/**
 * React wrapper component for the chromoton.js simulation
 *
 * @param {Object} props
 * @param {number} [props.width=240] - Initial grid width (clarity)
 * @param {number} [props.height] - Initial grid height (auto-calculated if not provided)
 * @param {boolean} [props.autoStart=true] - Whether to start the simulation automatically
 * @param {string} [props.className] - Additional CSS classes for the container
 */
export default function Chromoton({
  width = 240,
  height,
  autoStart = true,
  className = '',
}) {
  // Internal mutation rate for the simulation (not exposed as a prop)
  const mutationRate = 0.002
  const containerRef = useRef(null)
  const isInitialized = useRef(false)
  const resizeTimeoutRef = useRef(null)

  useEffect(() => {
    // Initialize chromoton if not already done
    if (!isInitialized.current && window.chromoton) {
      window.chromoton.init()
      isInitialized.current = true
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !window.chromoton) return

    // Function to calculate and update dimensions
    const updateDimensions = () => {
      const calculatedHeight =
        height ||
        (() => {
          const containerWidth = container.clientWidth
          const containerHeight = container.clientHeight
          const aspectRatio = containerHeight / containerWidth
          return Math.round(width * aspectRatio)
        })()

      window.chromoton.configure({
        width: width,
        height: calculatedHeight,
      })
    }

    // Initial configuration
    updateDimensions()

    // Set mutation rate
    window.chromoton.setMutationRate(mutationRate)

    // Start simulation if autoStart is true
    if (autoStart) {
      window.chromoton.show(container)
    }

    // Handle window resize with debouncing
    const handleResize = () => {
      // Clear existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }

      // Debounce resize events (wait 150ms after last resize)
      resizeTimeoutRef.current = setTimeout(() => {
        updateDimensions()
      }, 150)
    }

    // Add resize listener
    window.addEventListener('resize', handleResize)

    // Cleanup: stop simulation and remove resize listener when component unmounts
    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      if (window.chromoton) {
        window.chromoton.hide()
      }
    }
  }, [width, height, autoStart])

  return (
    <div
      ref={containerRef}
      className={`chromoton ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        padding: 0,
      }}
    >
      <canvas
        className="chromotons"
        width="640"
        height="640"
        style={{
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  )
}
