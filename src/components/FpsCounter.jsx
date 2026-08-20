import { useEffect, useState } from 'react'
import Typography from './primitives/Typography'

const POLL_MS = 250

/**
 * Small on-canvas readout of the simulation's actual measured step rate
 * (not the configured target fps) — for judging whether a given resolution
 * is keeping up. Hidden by default; toggled with the hidden 'f' shortcut
 * in Chromoton.jsx's onToggleFps.
 */
export default function FpsCounter({ show }) {
  const [fps, setFps] = useState(0)

  useEffect(() => {
    if (!show) return

    const poll = () => {
      if (window.chromoton && window.chromoton.getFps) {
        setFps(window.chromoton.getFps())
      }
    }

    poll()
    const interval = setInterval(poll, POLL_MS)
    return () => clearInterval(interval)
  }, [show])

  if (!show) return null

  return (
    <Typography
      as="div"
      intent="strong"
      className="pointer-events-none fixed top-5 left-5 z-[100] font-mono text-xs tracking-wider"
      style={{
        textShadow: '0 1px 3px rgba(0,0,0,0.6)',
      }}
    >
      {fps.toFixed(1)} fps
    </Typography>
  )
}
