import 'react'
import type { ChromotonCell } from './utils/colorUtils'
import type { Color } from './models/colorModel'

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined
  }
}

interface ChromotonAPI {
  init(): void
  configure(options: { width: number; height: number }): void
  setMutationRate(rate: number): void
  setStepInterval(ms: number): void
  setTargetColors(colors: Color[]): void
  setGrayscale(value: boolean): void
  show(container: HTMLElement): void
  hide(): void
  getPopulation(): { population: ChromotonCell[][]; xDim: number; yDim: number }
  setImageTargets(
    imageData: ImageData,
    colors: { black: Color; white: Color }
  ): void
  setImageTargetsIndexed(imageData: ImageData, palette: Color[]): void
  setImageDepthRange(far: number, near: number): void
  getImageDepthRange(): { far: number; near: number }
  isIndexedImageModeEnabled(): boolean
  clearImageTargets(): void
  isImageModeEnabled(): boolean
  setImageThreshold(value: number): void
  getImageThreshold(): number
  setAutoThreshold(enabled: boolean): void
  isAutoThresholdEnabled(): boolean
  setAutoThresholdTargetFraction(value: number): void
  getAutoThresholdTargetFraction(): number
  getEffectiveThreshold(): number
  setAutoDim(enabled: boolean): void
  isAutoDimEnabled(): boolean
  setAutoDimCoverageMax(value: number): void
  getAutoDimCoverageMax(): number
  getAutoDimCoverage(): number
  setAgitateTarget(enabled: boolean): void
  isAgitateTargetEnabled(): boolean
  getFps(): number
}

declare global {
  interface Window {
    chromoton?: ChromotonAPI
  }
}
