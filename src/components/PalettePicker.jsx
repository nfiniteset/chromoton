import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '../lib/utils'
import { PALETTES, PALETTE_DISPLAY_NAMES } from '../palettes'
import SubtleButton from './SubtleButton'
import ColorSwatch from './ColorSwatch'

import { FaChevronLeft } from 'react-icons/fa6'

export default function PalettePicker({
  palettes,
  currentPalette,
  onPaletteChange,
  onBack,
  isActive = false,
  className,
}) {
  const initialIndex = palettes.indexOf(currentPalette)
  const [focusedIndex, setFocusedIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0
  )
  const itemRefs = useRef([])
  const focusedIndexRef = useRef(focusedIndex)

  const handlePaletteClick = useCallback(
    (paletteName) => {
      onPaletteChange(paletteName)
      onBack()
    },
    [onPaletteChange, onBack]
  )

  // Keep ref in sync so focus-on-activate reads the latest value without a dep
  useEffect(() => {
    focusedIndexRef.current = focusedIndex
  }, [focusedIndex])

  useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex])

  // Focus the highlighted item whenever the picker becomes active
  useEffect(() => {
    if (!isActive) return
    requestAnimationFrame(() =>
      itemRefs.current[focusedIndexRef.current]?.focus()
    )
  }, [isActive])

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((i) => Math.max(0, i - 1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((i) => Math.min(palettes.length - 1, i + 1))
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          handlePaletteClick(palettes[focusedIndex])
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [focusedIndex, palettes, handlePaletteClick])

  return (
    <div className={cn('flex max-h-[calc(100vh-40px)] flex-col', className)}>
      <SubtleButton
        onClick={onBack}
        className="shrink-0 border-b pl-1"
        style={{ height: '62px' }}
      >
        <span className="flex items-center justify-center">
          <FaChevronLeft size="1em" />
          <span className="pl-1 text-xs tracking-wider uppercase">Back</span>
        </span>
      </SubtleButton>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-7">
        {palettes.map((paletteName, idx) => {
          const palette = PALETTES[paletteName]
          const isSelected = paletteName === currentPalette
          const isFocused = idx === focusedIndex

          return (
            <SubtleButton
              key={paletteName}
              ref={(el) => {
                itemRefs.current[idx] = el
              }}
              onClick={() => handlePaletteClick(paletteName)}
              active={isSelected}
              className={cn(
                'py-3',
                isFocused && 'subtle-button--keyboard-focused'
              )}
            >
              <div className="flex w-full flex-col items-start justify-start gap-2 border-0">
                <span className="text-[11px] tracking-wider uppercase">
                  {PALETTE_DISPLAY_NAMES[paletteName]}
                </span>

                {palette && (
                  <div className="flex gap-1.5">
                    {palette.map((color, index) => (
                      <ColorSwatch key={index} color={color} />
                    ))}
                  </div>
                )}

                {!palette && (
                  <div className="flex gap-1.5">
                    {[...Array(6)].map((_, index) => (
                      <ColorSwatch key={index} placeholder />
                    ))}
                  </div>
                )}
              </div>
            </SubtleButton>
          )
        })}
      </div>
    </div>
  )
}
