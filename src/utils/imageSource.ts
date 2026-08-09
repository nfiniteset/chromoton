/**
 * Flexible image sources for image-mode target coloring.
 *
 * An ImageSource is anything that can eventually produce an ImageData —
 * a file the user picked, a URL, a live canvas elsewhere in the app, a
 * static ImageData, or a procedurally generated test pattern. The engine
 * (chromoton.js) only ever deals with the resulting ImageData, so new
 * source types can be added here without touching the simulation.
 */
export interface ImageSource {
  getImageData(): Promise<ImageData>
}

/** Wrap an already-decoded ImageData (e.g. loaded elsewhere, or cached). */
export function fromImageData(data: ImageData): ImageSource {
  return {
    async getImageData() {
      return data
    },
  }
}

/**
 * Read from a canvas element. Pass a getter function (rather than the
 * element itself) to sample a canvas that's still being drawn to elsewhere
 * in the app — the canvas is read fresh on every getImageData() call.
 */
export function fromCanvas(
  canvas: HTMLCanvasElement | (() => HTMLCanvasElement)
): ImageSource {
  return {
    async getImageData() {
      const el = typeof canvas === 'function' ? canvas() : canvas
      const ctx = el.getContext('2d')
      if (!ctx) throw new Error('Canvas has no 2D context')
      return ctx.getImageData(0, 0, el.width, el.height)
    },
  }
}

/** Load an image from a URL (including object URLs from a file input). */
export function fromURL(url: string): ImageSource {
  return {
    async getImageData() {
      const img = await loadImage(url)
      return drawToImageData(img, img.naturalWidth, img.naturalHeight)
    },
  }
}

/** Load an image from a File or Blob (e.g. a `<input type="file">` pick). */
export function fromFile(file: File | Blob): ImageSource {
  return {
    async getImageData() {
      const bitmap = await createImageBitmap(file)
      return drawToImageData(bitmap, bitmap.width, bitmap.height)
    },
  }
}

/**
 * Generates a black background with a white circle covering roughly half
 * the image area. Handy default for exercising image mode end-to-end
 * without needing a real image file.
 */
export function generateCircleTestImage(
  width = 256,
  height = 256,
  areaFraction = 0.5
): ImageSource {
  return {
    async getImageData() {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas has no 2D context')

      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)

      const radius = Math.sqrt((areaFraction * width * height) / Math.PI)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2)
      ctx.fill()

      return ctx.getImageData(0, 0, width, height)
    },
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

function drawToImageData(
  source: CanvasImageSource,
  width: number,
  height: number
): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas has no 2D context')
  ctx.drawImage(source, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}
