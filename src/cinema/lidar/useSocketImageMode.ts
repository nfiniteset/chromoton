import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Color } from '../../models/colorModel'

// The sim applies target updates at most every 100ms, so there is nothing
// to gain from decoding faster. This sits a little under that: a phone
// nominally sending at 10fps arrives with tens of milliseconds of jitter,
// and a strict 100ms gate would reject every frame that turned up early —
// halving an already-marginal rate. The 20ms of slack costs nothing (the
// sim ignores the extra applies) and keeps a 10fps stream intact.
const MIN_APPLY_INTERVAL_MS = 80

// Reconnect backoff. Starts fast because the overwhelmingly common case is
// the server not being up *yet* during setup, and caps low because five
// seconds is already a long time to stand on a stage wondering.
const RECONNECT_MIN_MS = 500
const RECONNECT_MAX_MS = 5000

// How often the measured frame rate is recomputed and pushed to the panel.
// Everything else in the status object changes rarely, so this interval is
// effectively the hook's whole re-render budget: twice a second, not ten.
const STATUS_INTERVAL_MS = 500

// Matches the engine's own default overlay cutoff. Only used for the
// preview composite here — the engine re-derives it from the mask itself.
const OVERLAY_THRESHOLD = 128

/** The per-frame header, as documented in docs/live-lidar-input.md. */
export interface FrameHeader {
  t: number
  w: number
  h: number
  near: number
  far: number
  channels: { depth: boolean; mask: boolean; confidence: boolean }
  tracking: string
}

export type ConnectionState = 'off' | 'connecting' | 'live' | 'lost' | 'invalid'

export interface SocketStatus {
  state: ConnectionState
  /** Measured over the last STATUS_INTERVAL_MS, not the header's claim. */
  fps: number
  /** Most recent header, kept after a dropout so the panel doesn't blank. */
  header: FrameHeader | null
  /** Last thing that went wrong, cleared on a successful frame. */
  error: string | null
}

export interface SocketImageModeOptions {
  url: string
  palette: Color[] | null
  personColor: Color
  enabled: boolean
  /** Canvases to mirror a composite preview into. May contain nulls. */
  previewRefs?: RefObject<HTMLCanvasElement | null>[]
}

/**
 * Where a distance in metres lands on the depth channel *after* the split
 * has flipped it to nearness: the window's near end is 255, its far end 0.
 *
 * This is the inverse of the flip in splitChannels, and exists so the
 * panel's Far/Near sliders can be labelled in real distance. The engine's
 * depth range is a luma window, and it stays one — the translation happens
 * here rather than in the engine, which has no notion of metres and should
 * not acquire one for a single variation.
 */
export function lumaForMetres(metres: number, near: number, far: number) {
  if (!(far > near)) return 0
  const t = (metres - near) / (far - near)
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t
  return Math.round(255 * (1 - clamped))
}

interface FrameBuffers {
  width: number
  height: number
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  depth: ImageData
  mask: ImageData
  preview: ImageData
}

function allocateBuffers(width: number, height: number): FrameBuffers {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas has no 2D context')

  const depth = new ImageData(width, height)
  const mask = new ImageData(width, height)
  const preview = new ImageData(width, height)
  // Alpha is written once here rather than per-pixel per-frame: the engine
  // reads only RGB, and the preview canvas just needs these opaque.
  for (const image of [depth, mask, preview]) {
    for (let i = 3; i < image.data.length; i += 4) image.data[i] = 255
  }

  return { width, height, canvas, ctx, depth, mask, preview }
}

/**
 * Split one packed RGB frame into the two ImageDatas the engine wants, plus
 * a composite for the panel thumbnail.
 *
 * The engine derives luma from RGB (`(R*77 + G*150 + B*29) >> 8`), so it
 * cannot read a packed image directly — each channel is replicated across
 * all three so luma equals that channel exactly. Doing the split here
 * rather than teaching the engine about channel selectors keeps the
 * engine's surface unchanged for the sake of one variation.
 *
 * The depth channel is flipped on the way through. On the wire it is metres
 * (0 = nearest); the engine maps darkest luma to band 0 and the ramp runs
 * far → near, so it needs nearness. One subtraction per pixel, and every
 * other piece of the variation reads exactly as hybrid's does.
 *
 * The B channel — confidence — is deliberately not consumed. It is
 * transmitted from the start because it costs nothing to pack, but nothing
 * in v1 knows what to do with a map of where the sensor is unsure.
 */
function splitChannels(
  packed: ImageData,
  buffers: FrameBuffers,
  personColor: Color,
  hasMask: boolean
) {
  const src = packed.data
  const depth = buffers.depth.data
  const mask = buffers.mask.data
  const preview = buffers.preview.data

  for (let i = 0; i < src.length; i += 4) {
    const nearness = 255 - src[i]
    depth[i] = nearness
    depth[i + 1] = nearness
    depth[i + 2] = nearness

    const person = src[i + 1]
    mask[i] = person
    mask[i + 1] = person
    mask[i + 2] = person

    if (hasMask && person >= OVERLAY_THRESHOLD) {
      preview[i] = personColor.r
      preview[i + 1] = personColor.g
      preview[i + 2] = personColor.b
    } else {
      preview[i] = nearness
      preview[i + 1] = nearness
      preview[i + 2] = nearness
    }
  }
}

/**
 * Hand the split-out frame to the engine.
 *
 * A header that says the mask is unavailable renders bands only. The engine
 * drops a malformed overlay rather than half-applying one, so degrading
 * honestly here costs nothing downstream.
 */
function applyToEngine(
  buffers: FrameBuffers,
  header: FrameHeader,
  palette: Color[] | null,
  personColor: Color
) {
  if (!palette?.length || !window.chromoton) return
  const overlay = header.channels?.mask
    ? { data: buffers.mask, color: personColor }
    : undefined
  window.chromoton.setImageTargetsIndexed(buffers.depth, palette, overlay)
}

/** Mirror the composite into every thumbnail canvas that currently exists. */
function drawPreview(
  buffers: FrameBuffers,
  refs: RefObject<HTMLCanvasElement | null>[] | undefined
) {
  if (!refs?.length) return
  // The packed frame in this canvas has already been split out of, so it is
  // free to overwrite with the composite.
  buffers.ctx.putImageData(buffers.preview, 0, 0)
  for (const ref of refs) {
    const target = ref.current
    if (!target) continue
    const ctx = target.getContext('2d')
    ctx?.drawImage(buffers.canvas, 0, 0, target.width, target.height)
  }
}

/**
 * Rebuild the preview composite from the split's own outputs.
 *
 * The packed source frame is long gone by the time a color changes, but the
 * two ImageDatas it was split into are not — and the composite is the only
 * thing that bakes in the person color, so it has to be redone when that
 * color moves.
 */
function recomposePreview(
  buffers: FrameBuffers,
  header: FrameHeader,
  personColor: Color
) {
  const preview = buffers.preview.data
  const mask = buffers.mask.data
  const depth = buffers.depth.data
  const hasMask = !!header.channels?.mask
  for (let i = 0; i < preview.length; i += 4) {
    if (hasMask && mask[i] >= OVERLAY_THRESHOLD) {
      preview[i] = personColor.r
      preview[i + 1] = personColor.g
      preview[i + 2] = personColor.b
    } else {
      preview[i] = depth[i]
      preview[i + 1] = depth[i]
      preview[i + 2] = depth[i]
    }
  }
}

/**
 * Feeds the engine's indexed image mode from a WebSocket carrying packed
 * depth + person-mask + confidence frames (docs/live-lidar-input.md).
 *
 * The socket replaces hybrid's pair of <video> elements, and with them goes
 * every problem those had: there is no timeline to seek, no second element
 * to keep in register, and no drift to snap back — the two signals arrive
 * in the same image and cannot come apart.
 *
 * What replaces them is the opposite problem. A video can be paused and
 * resampled; a live source cannot, so the rules here are about *what to
 * discard*:
 *
 *  * Frames arriving faster than the sim can use them are dropped, not
 *    queued. A backlog shows up as steadily growing latency, which for a
 *    live performer is far worse than a skipped frame.
 *  * Only the newest undecoded frame is kept while a decode is in flight,
 *    for the same reason.
 *  * The last good frame is held on dropout rather than cleared. A frozen
 *    image reads as a held moment; a black screen reads as a failure. It is
 *    also kept so a color change still lands while disconnected — the panel
 *    stays usable during setup, which is when it is actually being used.
 */
export function useSocketImageMode(
  options: SocketImageModeOptions
): SocketStatus {
  const { url, palette, personColor, enabled } = options

  const usable = /^wss?:\/\/.+/i.test(url)
  const initialStatus = (): SocketStatus => {
    if (!enabled) return { state: 'off', fps: 0, header: null, error: null }
    if (!usable) {
      return {
        state: 'invalid',
        fps: 0,
        header: null,
        error: 'URL must start with ws:// or wss://',
      }
    }
    return { state: 'connecting', fps: 0, header: null, error: null }
  }

  const [status, setStatus] = useState<SocketStatus>(initialStatus)

  // Turning the connection off, or pointing it somewhere else, invalidates
  // everything the panel is showing about the old one. Reset during render
  // rather than from the effect: the effect runs *after* the frame paints,
  // so a disconnect would otherwise flash the previous connection's "Live"
  // and frame rate for as long as it took to get there.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const connectionKey = `${enabled ? 1 : 0}|${url}`
  const [prevConnectionKey, setPrevConnectionKey] = useState(connectionKey)
  if (connectionKey !== prevConnectionKey) {
    setPrevConnectionKey(connectionKey)
    setStatus(initialStatus())
  }

  // Live view of the render's options for the socket effect, which must not
  // be torn down and rebuilt every time a color changes.
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  // The held frame. Deliberately outside the socket effect: a dropout, a
  // disconnect, or a URL edit all tear that effect down, and the last good
  // frame has to survive all three — both to stay on screen and to stay
  // re-colorable from the panel while nothing is arriving.
  const buffersRef = useRef<FrameBuffers | null>(null)
  const headerRef = useRef<FrameHeader | null>(null)

  useEffect(() => {
    // Both of these are already reflected in the status set during render,
    // so there is nothing for the effect to do but stay out of the way.
    if (!enabled || !usable) return

    let stopped = false
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let backoff = RECONNECT_MIN_MS

    let pending: ArrayBuffer | null = null
    let decoding = false
    let lastApplied = 0

    let framesSinceStatus = 0
    let lastStatusAt = performance.now()
    let latestError: string | null = null
    let connectionState: ConnectionState = 'connecting'
    // Whether *this* URL has ever been open, which is what separates
    // "reconnecting" from "connecting". Not the same question as whether a
    // frame is held: point the panel at a new URL and the old frame is
    // still on screen, but calling that a reconnection would be a lie.
    let everOpened = false

    // Status is pushed on a timer rather than per frame: at 12fps a
    // setState per frame would re-render the whole panel twelve times a
    // second to change a number that is only read by a human.
    const pushStatus = (fps: number) => {
      setStatus((prev) => {
        if (
          prev.state === connectionState &&
          prev.fps === fps &&
          prev.header === headerRef.current &&
          prev.error === latestError
        ) {
          return prev
        }
        return {
          state: connectionState,
          fps,
          header: headerRef.current,
          error: latestError,
        }
      })
    }

    const statusTimer = setInterval(() => {
      const now = performance.now()
      const elapsed = now - lastStatusAt
      const fps = elapsed > 0 ? (framesSinceStatus * 1000) / elapsed : 0
      framesSinceStatus = 0
      lastStatusAt = now
      pushStatus(connectionState === 'live' ? Math.round(fps * 10) / 10 : 0)
    }, STATUS_INTERVAL_MS)

    const handleFrame = async (buffer: ArrayBuffer) => {
      if (buffer.byteLength < 4) throw new Error('Frame shorter than header')
      const headerLength = new DataView(buffer).getUint32(0)
      if (headerLength === 0 || 4 + headerLength > buffer.byteLength) {
        throw new Error(`Header length out of range (${headerLength})`)
      }

      const header = JSON.parse(
        new TextDecoder().decode(new Uint8Array(buffer, 4, headerLength))
      ) as FrameHeader

      const png = new Blob([new Uint8Array(buffer, 4 + headerLength)], {
        type: 'image/png',
      })
      // createImageBitmap decodes off the main thread, which is the whole
      // reason PNG is affordable here at all.
      const bitmap = await createImageBitmap(png)
      if (stopped) {
        bitmap.close()
        return
      }

      let buffers = buffersRef.current
      if (
        !buffers ||
        buffers.width !== bitmap.width ||
        buffers.height !== bitmap.height
      ) {
        buffers = allocateBuffers(bitmap.width, bitmap.height)
        buffersRef.current = buffers
      }

      buffers.ctx.drawImage(bitmap, 0, 0)
      bitmap.close()
      const packed = buffers.ctx.getImageData(
        0,
        0,
        buffers.width,
        buffers.height
      )

      headerRef.current = header
      latestError = null
      const { palette: livePalette, personColor: liveColor } =
        optionsRef.current
      splitChannels(packed, buffers, liveColor, !!header.channels?.mask)
      applyToEngine(buffers, header, livePalette, liveColor)
      drawPreview(buffers, optionsRef.current.previewRefs)
    }

    // Latest-wins: whatever arrived most recently is decoded next, and
    // anything it overtook is simply gone.
    const pump = async () => {
      if (decoding) return
      decoding = true
      try {
        while (pending && !stopped) {
          const buffer = pending
          pending = null
          try {
            await handleFrame(buffer)
          } catch (err) {
            latestError = err instanceof Error ? err.message : String(err)
          }
        }
      } finally {
        decoding = false
      }
    }

    const connect = () => {
      if (stopped) return
      connectionState = everOpened ? 'lost' : 'connecting'

      let ws: WebSocket
      try {
        ws = new WebSocket(url)
      } catch (err) {
        latestError = err instanceof Error ? err.message : String(err)
        scheduleReconnect()
        return
      }
      ws.binaryType = 'arraybuffer'
      socket = ws

      ws.onopen = () => {
        backoff = RECONNECT_MIN_MS
        connectionState = 'live'
        everOpened = true
        latestError = null
      }

      ws.onmessage = (event) => {
        if (!(event.data instanceof ArrayBuffer)) return
        framesSinceStatus++

        // Gate before decoding, not after: a frame the sim has no room for
        // shouldn't cost a PNG decode on the way to being thrown away.
        const now = performance.now()
        if (now - lastApplied < MIN_APPLY_INTERVAL_MS) return
        lastApplied = now

        pending = event.data
        void pump()
      }

      ws.onerror = () => {
        // The event carries no detail by design (browsers withhold it to
        // avoid leaking cross-origin information), so onclose is where the
        // reconnect actually happens.
        latestError = `Cannot reach ${url}`
      }

      ws.onclose = () => {
        if (stopped) return
        socket = null
        // 'lost' rather than 'connecting' once this URL has been open —
        // the held image on screen is real, and the panel should say so.
        connectionState = everOpened ? 'lost' : 'connecting'
        scheduleReconnect()
      }
    }

    function scheduleReconnect() {
      if (stopped) return
      const delay = backoff
      backoff = Math.min(RECONNECT_MAX_MS, backoff * 2)
      reconnectTimer = setTimeout(connect, delay)
    }

    connect()

    return () => {
      stopped = true
      clearInterval(statusTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (socket) {
        // Drop the handlers first: onclose would otherwise fire during
        // teardown and schedule a reconnect for a socket nobody wants.
        socket.onopen = null
        socket.onmessage = null
        socket.onerror = null
        socket.onclose = null
        socket.close()
      }
    }
  }, [url, enabled, usable])

  // Colors change from the panel, not from the socket, so they need their
  // own path back to the engine. This is the path that keeps the panel
  // usable while nothing is arriving — which, during setup, is most of the
  // time someone actually spends in it.
  useEffect(() => {
    const buffers = buffersRef.current
    const header = headerRef.current
    if (!buffers || !header) return
    recomposePreview(buffers, header, personColor)
    applyToEngine(buffers, header, palette, personColor)
    drawPreview(buffers, optionsRef.current.previewRefs)
  }, [palette, personColor])

  return status
}
