import { useRef, useState } from 'react'
import { cn } from '../lib/utils'
import { useCanvasContrast } from '../hooks/useCanvasContrast'
import IconButton from '../components/primitives/IconButton'
import { FaPlay, FaPause } from 'react-icons/fa6'

/**
 * Bottom-docked playback bar: play/pause + a seek range bound to the
 * primary video's currentTime/duration, plus a floating thumbnail above the
 * thumb while dragging or hovering the track. Purely presentational — drag
 * state and the actual thumbnail canvas are owned by the parent (CinemaApp);
 * this just positions the floating one, using `value`/`duration` while
 * dragging (the committed position) or the pointer's own offset over the
 * track while merely hovering (a preview, not yet committed).
 *
 * Sits at the bottom of the screen, a different region of the sim canvas
 * than the settings panel (top-right) — so it samples its own contrast
 * independently (via its own `useCanvasContrast`) rather than inheriting
 * the panel's `--ct-*` vars, and scopes the result to its own bar element
 * so it doesn't clobber the panel's global theme.
 *
 * `data-cinema-ui` marks this element so the panel's click-to-toggle and
 * idle-hide logic can tell a click/hover on the bar itself apart from the
 * sim.
 */
export default function Scrubber({
  value,
  duration,
  playing,
  onTogglePlay,
  onPointerDown,
  onInput,
  onPointerUp,
  onTrackHover,
  hidden = false,
  isDragging = false,
  dragThumbnailRef,
  dragThumbWidth = 120,
  dragThumbHeight = 90,
  className = '',
}) {
  const barRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const trackRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [hoverFraction, setHoverFraction] = useState(
    /** @type {number | null} */ (null)
  )
  const contrastColors = useCanvasContrast(barRef)
  const fraction = duration > 0 ? value / duration : 0

  // Hover-scrub: while merely hovering (not dragging), follow the pointer
  // instead of `value` so the floating thumbnail previews whatever the
  // pointer is over without touching the committed playback position.
  const handleTrackMouseMove = (e) => {
    if (isDragging || !duration) return
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    setHoverFraction(frac)
    onTrackHover?.(frac * duration)
  }

  const handleTrackMouseLeave = () => {
    setHoverFraction(null)
  }

  const showThumbnail = isDragging || hoverFraction !== null
  const thumbnailFraction = isDragging ? fraction : (hoverFraction ?? 0)

  return (
    <div
      data-cinema-ui="scrubber"
      className={cn(
        'fixed bottom-6 left-1/2 z-[100] w-full max-w-3xl -translate-x-1/2 px-4 sm:w-11/12 sm:max-w-6xl sm:px-0',
        className
      )}
      style={{
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        transition: 'opacity 300ms ease-out',
      }}
    >
      <div
        ref={barRef}
        className="flex items-center gap-2 rounded-2xl bg-white/8 p-1 pr-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl backdrop-saturate-[180%]"
        style={{
          '--ct-text': contrastColors.text,
          '--ct-text-weak': contrastColors.textWeak,
          '--ct-text-active': contrastColors.textActive,
          '--ct-icon': contrastColors.icon,
          '--ct-border': contrastColors.border,
          '--ct-border-hover': contrastColors.borderHover,
          '--ct-border-focus': contrastColors.borderFocus,
          '--ct-slider-thumb': contrastColors.sliderThumb,
          '--ct-bg-hover': contrastColors.backgroundHover,
          '--ct-bg-active': contrastColors.backgroundActive,
          '--ct-bg-active-hover': contrastColors.backgroundActiveHover,
        }}
      >
        <IconButton
          onClick={onTogglePlay}
          className="h-8 w-8 flex-none rounded-xl"
        >
          {playing ? <FaPause size="1em" /> : <FaPlay size="1em" />}
        </IconButton>

        <div
          ref={trackRef}
          className="relative flex min-w-0 flex-1 items-center"
          onMouseMove={handleTrackMouseMove}
          onMouseLeave={handleTrackMouseLeave}
        >
          {showThumbnail && (
            <canvas
              ref={dragThumbnailRef}
              width={dragThumbWidth}
              height={dragThumbHeight}
              className="pointer-events-none absolute bottom-full mb-2 rounded-md border shadow-lg"
              style={{
                left: `${thumbnailFraction * 100}%`,
                transform: 'translateX(-50%)',
                borderColor: 'var(--ct-border)',
              }}
            />
          )}

          <input
            type="range"
            min={0}
            max={duration || 0}
            step="any"
            value={value}
            onPointerDown={onPointerDown}
            onInput={onInput}
            onPointerUp={onPointerUp}
            disabled={!duration}
            className="h-0.5 w-full cursor-pointer appearance-none rounded-sm outline-none [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full"
            style={{
              background: 'var(--ct-border)',
              transition: 'background var(--duration-color) ease-out',
            }}
          />
        </div>
      </div>
    </div>
  )
}
