import type { Color } from '../models/colorModel'

/**
 * Samples the canvas region behind a given element, averaging 30 horizontally
 * distributed pixels across the vertical midline.
 */
export function sampleCanvasRegion(element: HTMLElement): Color | null {
  const canvas = document.querySelector<HTMLCanvasElement>('.chromotons')
  if (!canvas) return null

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  const canvasRect = canvas.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()

  const scaleX = canvas.width / canvasRect.width
  const scaleY = canvas.height / canvasRect.height

  let sampleX = (elementRect.left - canvasRect.left) * scaleX
  let sampleY = (elementRect.top - canvasRect.top) * scaleY
  let sampleWidth = elementRect.width * scaleX
  let sampleHeight = elementRect.height * scaleY

  sampleX = Math.max(0, Math.min(sampleX, canvas.width - 1))
  sampleY = Math.max(0, Math.min(sampleY, canvas.height - 1))
  sampleWidth = Math.min(sampleWidth, canvas.width - sampleX)
  sampleHeight = Math.min(sampleHeight, canvas.height - sampleY)

  const samplePoints = 30
  let totalR = 0
  let totalG = 0
  let totalB = 0
  let validSamples = 0

  for (let i = 0; i < samplePoints; i++) {
    const x = Math.floor(
      sampleX +
        (sampleWidth / samplePoints) * i +
        sampleWidth / (samplePoints * 2)
    )
    const y = Math.floor(sampleY + sampleHeight / 2)

    try {
      const data = ctx.getImageData(x, y, 1, 1).data
      totalR += data[0]
      totalG += data[1]
      totalB += data[2]
      validSamples++
    } catch {
      continue
    }
  }

  if (validSamples === 0) return null

  return {
    r: Math.round(totalR / validSamples),
    g: Math.round(totalG / validSamples),
    b: Math.round(totalB / validSamples),
  }
}
