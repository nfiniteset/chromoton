import { useState, useEffect, useRef, type RefObject } from 'react'
import { sampleCanvasRegion } from '../utils/colorSampling'
import {
  bestPolarityWithHysteresis,
  type Polarity,
} from '../utils/contrastPolarity'
import {
  buildPanelTheme,
  defaultContrastColors,
  toEffectiveBackground,
  type ContrastColors,
} from '../utils/themeBuilder'

export type { ContrastColors }

export function useCanvasContrast(
  panelRef: RefObject<HTMLElement | null>
): ContrastColors {
  const [colors, setColors] = useState<ContrastColors>(defaultContrastColors)
  const polarityRef = useRef<Polarity>('light')
  const lastColorsRef = useRef<ContrastColors>(defaultContrastColors())

  useEffect(() => {
    if (!panelRef?.current) return

    function tick() {
      if (!panelRef.current) return
      const raw = sampleCanvasRegion(panelRef.current)
      if (!raw) return

      const effective = toEffectiveBackground(raw)
      const polarity = bestPolarityWithHysteresis(
        effective,
        polarityRef.current
      )
      polarityRef.current = polarity

      const next = buildPanelTheme(raw, polarity)
      if (!colorsAreEqual(next, lastColorsRef.current)) {
        lastColorsRef.current = next
        setColors(next)
      }
    }

    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [panelRef])

  return colors
}

function colorsAreEqual(a: ContrastColors, b: ContrastColors): boolean {
  return (
    a.text === b.text &&
    a.textAlpha === b.textAlpha &&
    a.textWeak === b.textWeak &&
    a.textHeader === b.textHeader &&
    a.textActive === b.textActive &&
    a.icon === b.icon &&
    a.iconActive === b.iconActive &&
    a.border === b.border &&
    a.borderHover === b.borderHover &&
    a.borderFocus === b.borderFocus &&
    a.sliderThumb === b.sliderThumb &&
    a.backgroundHover === b.backgroundHover &&
    a.backgroundActive === b.backgroundActive &&
    a.backgroundActiveHover === b.backgroundActiveHover
  )
}
