# Live LiDAR input over WebSocket

Design sketch, 2026-09-10. Nothing built. Companion to
[3d-source-tiers.md](3d-source-tiers.md) and
[hybrid-pipeline.md](hybrid-pipeline.md), whose two-signal variation this
feeds from a phone instead of from rendered files.

## What this is

The hybrid variation consumes two signals: a depth map for the environment
and a person mask lifted over it. An iPhone Pro produces both on-device, at
frame rate, with no models to run — plus a third the offline pipeline has
no equivalent for. This is how those get from the phone into the sim, over
one connection that works the same whether the phone is plugged in or not.

**No engine work is required.** `setImageTargetsIndexed`'s `overlay`
argument takes an `ImageData` and has no idea where it came from, and
`fromCanvas()` already exists in [imageSource.ts](../src/utils/imageSource.ts).
This is a new variation, not a new engine capability.

## The phone is the server

This is the decision that makes supporting both links nearly free.

Put the WebSocket **server on the phone** and the client in the browser.
Then the two transports differ only in the URL:

|          | URL the browser opens         |
| -------- | ----------------------------- |
| wireless | `ws://<phone-ip>:8080/frames` |
| USB      | `ws://localhost:8080/frames`  |

USB works because `usbmuxd` — already on any Mac with Xcode — tunnels TCP
to a connected device. `iproxy 8080 8080` (from `brew install
libimobiledevice`; newer builds also accept `iproxy 8080:8080`) forwards a
local port to the phone, and everything above the socket is identical.

Inverting it — Mac as server, phone as client — would need reverse
forwarding over USB, which is the awkward direction. Phone-as-server keeps
one implementation, and the connection URL becomes a setting in the panel
rather than a branch in the code.

## Frame format

One RGB image per tick, three channels, one per signal.

| channel | signal      | encoding                                                           |
| ------- | ----------- | ------------------------------------------------------------------ |
| **R**   | depth       | metres, linearly quantized across the header's `near`/`far` window |
| **G**   | person mask | 0 or 255                                                           |
| **B**   | confidence  | 0 / 128 / 255 for ARKit's low / medium / high                      |

Packing all three into one image means one message per tick instead of
three, and no possibility of the channels arriving out of step with each
other — the same failure the hybrid variation has to actively correct for
between its two video elements.

### Message framing

Each WebSocket binary message:

```
[uint32 headerLength][header JSON, UTF-8][PNG bytes]
```

The header is what preserves the metric-depth advantage — the reason to
prefer LiDAR over monocular inference in the first place:

```json
{
  "t": 1757530000.123,
  "w": 256,
  "h": 192,
  "near": 0.5,
  "far": 5.0,
  "channels": { "depth": true, "mask": true, "confidence": true },
  "tracking": "normal"
}
```

`near`/`far` are metres, so the panel's Far/Near sliders can be labelled in
real distance and stay put frame to frame. `channels` lets the phone
degrade honestly — if person segmentation is unavailable, it says so and
the sim renders bands only, which the engine's overlay argument already
handles by dropping a malformed overlay rather than half-applying it.
`tracking` carries ARKit's state so the panel can say why the image went
strange rather than just showing garbage.

### Why PNG

Measured on the real depth asset at 256×192:

| payload                        | bytes/frame | at 10 fps    |
| ------------------------------ | ----------- | ------------ |
| raw Float32 depth alone        | 196,608     | 15.7 Mbps    |
| raw 8-bit, three channels      | 147,456     | 11.8 Mbps    |
| **PNG, three channels packed** | **21,359**  | **1.7 Mbps** |

Lossless, decoded natively by the browser via `createImageBitmap` (async,
off the main thread), and ~7× smaller than raw. At 10 fps it is far below
what any link here carries, so there is no reason to reach for a lossy
codec — and a positive reason not to.

**Do not use JPEG.** It rings at hard edges, and the mask channel is
nothing but hard edges. This is the same failure already measured in this
project when choosing h264 settings for the offline assets, where flat
label regions needed `-crf 14` to survive intact. The mask compresses to
under a kilobyte as PNG anyway.

Raw frames stay available as a fallback if PNG decode ever shows up in a
profile — on USB the bandwidth is free — but that is a measured decision to
make later, not now.

## The browser side

A new variation, `src/cinema/lidar/`, forked from `hybrid/`. What changes:

- **`useSocketImageMode.ts`** replaces `useVideoImageMode.ts`. It owns the
  socket, keeps only the most recent decoded frame, and applies to the
  engine on the existing ≤10 Hz throttle. Frames arriving faster are
  dropped, not queued — a backlog would show as growing latency, which for
  a live performer is worse than a skipped frame.
- **Channel split.** The engine derives luma from RGB
  (`(R*77 + G*150 + B*29) >> 8`), so it cannot read a packed image
  directly. Draw the decoded frame once, `getImageData`, then build two
  `ImageData`s with R and G each replicated across RGB, making luma equal
  the channel exactly. One pass over 49k pixels per tick — nothing. Doing
  the split here rather than teaching the engine about channel selectors
  keeps the engine's surface unchanged.
- **Panel** gains a Connection section: URL, connection state, measured
  frame rate, and ARKit tracking state. Far/Near relabelled in metres.
  Everything else — bands, environment gradient, person color, auto-dim —
  carries over unchanged.
- **No scrubber.** There is no timeline to seek. The Scrubber and the
  preview-video machinery come out.

## The phone side

Swift, `ARWorldTrackingConfiguration` with `frameSemantics` covering
smoothed scene depth and person segmentation. Per frame: read
`smoothedSceneDepth.depthMap` (Float32 metres), `.confidenceMap`, and
`segmentationBuffer`; resample all three to a common 256×192; quantize
depth across the configured window; pack, PNG-encode, send.

`smoothedSceneDepth` rather than `sceneDepth` deliberately — ARKit is doing
the temporal smoothing that [preprocess-depth.py](../src/cinema/hybrid/preprocess-depth.py)
implements by hand, and temporal stability is the thing that has broken
every previous experiment here.

Send at 10–15 fps, not 60. The sim cannot consume more, and the difference
is most of the thermal budget: ARKit plus LiDAR plus encoding at full rate
will heat a phone into throttling partway through a performance.

## Testing without a phone

Build and verify the entire browser side before any Swift exists: a small
Python mock server that replays the finished `forsythe_depth.mp4` and
`forsythe_people.mp4` as packed RGB frames over the identical protocol,
synthesizing a plausible confidence channel.

This is the same approach that worked for the hybrid variation, where
placeholder assets let the variation be built and checked while its real
render was still hours away. It also gives a permanent regression harness
that needs no hardware.

## Robustness for a live show

- **Auto-reconnect** with backoff, and **hold the last good frame** on
  dropout rather than going black. A frozen image reads as a held moment;
  a black screen reads as a failure.
- **Connection state visible** in the panel, since the failure will happen
  during setup, not during the piece.
- **Prefer USB when it matters.** It is lower latency, immune to a room
  full of contending phones, and charges the device — which also removes
  the battery question for a long set. Wireless is the fallback, not the
  default. If wireless is used, put the Mac on the **phone's Personal
  Hotspot** rather than venue WiFi: a direct link with no router, no DHCP
  surprises, and no audience contention.
- **Keep the screen awake** (`isIdleTimerDisabled`) — a suspended app stops
  producing frames.

## Open questions

- **Which `frameSemantics` actually coexist.** Depth, person segmentation
  and body tracking are gated per `ARConfiguration`, and body tracking is a
  separate configuration from world tracking. Verify against the docs
  before designing around any particular combination.
- **ARKit person segmentation quality** at performance distances. It is
  tuned for one or two people close to the camera; Mask2Former will very
  likely beat it on distant figures under stage lighting.
- **~5 m LiDAR range** is the hard limit on the whole idea. This is a
  close-range instrument — right for a solo performer, wrong for a
  Forsythe-scale room of dancers at mixed distances, where a RealSense
  D455 or monocular inference fits better.
- **What to do with the confidence channel.** Transmitted from the start
  because it is free, but consumed by nothing in v1. It is a map of where
  the sensor is unsure — edges, dark or shiny surfaces, distance — which is
  neither geometry nor semantics and sits on no tier of the existing
  ladder. Worth playing with once there is something to look at.

## Build order

1. **Protocol + mock server.** Python, replaying the existing rendered
   assets as packed RGB frames. Nothing else can be tested until this
   exists.
2. **`src/cinema/lidar/`** forked from `hybrid/`: socket hook, channel
   split, panel Connection section, scrubber removed. Verified end to end
   against the mock.
3. **Phone app**, wireless first — it needs no `iproxy` and fails more
   legibly while the frame format is still settling.
4. **USB path.** `iproxy` plus a URL change; if step 2 was built right this
   is configuration, not code.
5. **Tune** against a real body in a real space, and decide whether
   confidence earns a role.

## Rejected

|                                          | why not                                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Mac as server, phone as client           | needs reverse forwarding over USB, the awkward direction; splits one implementation into two                           |
| Three separate messages, one per channel | reintroduces exactly the cross-channel sync problem the hybrid variation has to correct between its two video elements |
| JPEG frames                              | rings at hard edges; the mask is all hard edges. Already measured in this project's h264 work                          |
| base64 JSON frames                       | inflates the payload ~33% for no benefit over binary                                                                   |
| Raw uncompressed frames                  | 7× the bandwidth; revisit only if PNG decode shows up in a profile                                                     |
| WebRTC                                   | worth it only for an RGB video track too, or to leave the LAN; overkill on a local link                                |
| Teaching the engine channel selectors    | the split is a few lines in the variation; the engine's surface stays unchanged                                        |
| 60 fps streaming                         | the sim throttles to 10 Hz, and full rate is most of the thermal budget                                                |
