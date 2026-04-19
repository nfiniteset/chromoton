import { useEffect, useRef } from 'react';
import '../chromoton.js';

/**
 * React wrapper component for the chromoton.js simulation
 *
 * @param {Object} props
 * @param {number} [props.width=240] - Initial grid width (clarity)
 * @param {number} [props.height] - Initial grid height (auto-calculated if not provided)
 * @param {number} [props.mutationRate=0.002] - Mutation rate for the genetic algorithm
 * @param {boolean} [props.autoStart=true] - Whether to start the simulation automatically
 * @param {string} [props.className] - Additional CSS classes for the container
 */
export default function Chromoton({
  width = 240,
  height,
  mutationRate = 0.002,
  autoStart = true,
  className = ''
}) {
  const containerRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Initialize chromoton if not already done
    if (!isInitialized.current && window.chromoton) {
      window.chromoton.init();
      isInitialized.current = true;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.chromoton) return;

    // Configure dimensions
    const calculatedHeight = height || (() => {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const aspectRatio = containerHeight / containerWidth;
      return Math.round(width * aspectRatio);
    })();

    window.chromoton.configure({
      width: width,
      height: calculatedHeight
    });

    // Set mutation rate
    window.chromoton.setMutationRate(mutationRate);

    // Start simulation if autoStart is true
    if (autoStart) {
      window.chromoton.show(container);
    }

    // Cleanup: stop simulation when component unmounts
    return () => {
      if (window.chromoton) {
        window.chromoton.hide();
      }
    };
  }, [width, height, mutationRate, autoStart]);

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
        padding: 0
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
          imageRendering: 'pixelated'
        }}
      />
    </div>
  );
}
