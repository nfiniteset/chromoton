# Live LiDAR input over WebSocket

Design sketch 2026-09-10; **steps 1-2 built the same day** — protocol, mock
server and the whole browser side, verified end to end against the mock.
Steps 3-5 (the phone app, USB, tuning) are still ahead. Companion to
[3d-source-tiers.md](3d-source-tiers.md) and
[hybrid-pipeline.md](hybrid-pipeline.md), whose two-signal variation this
feeds from a phone instead of from rendered files.

What is on disk:

|                                                                       |                                              |
| --------------------------------------------------------------------- | -------------------------------------------- |
| [src/cinema/lidar/mock-server.py](../src/cinema/lidar/mock-server.py) | the protocol, and a phone-less source for it |
| [src/cinema/lidar/](../src/cinema/lidar/)                             | the variation, forked from `hybrid/`         |
| `ws://127.0.0.1:8080/frames`                                          | the default the panel ships with             |

Everything below that is marked **measured** was measured against that pair;
the rest is still the sketch.

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

**The depth channel runs the opposite way to the offline assets, and the
browser flips it.** Metres put the nearest surface at 0. Depth Anything V2
outputs _inverse_ depth, so hybrid's video puts the nearest surface at 255,
and the engine's indexed path is built around that convention — darkest luma
is band 0, and the environment ramp runs far → near. The sketch's channel
split ("R replicated across RGB") would therefore have painted the far
colour on near surfaces. One subtraction in `splitChannels` undoes it, and
in exchange `environmentPalette.ts`, the panel's Farthest/Nearest fields and
the ramp preview all read exactly as hybrid's do. Keeping metres on the wire
is what matters: that is the phone's native unit and the format the Swift
side should not have to think about.

### Message framing

Each WebSocket binary message:

```
[uint32 headerLength, big-endian][header JSON, UTF-8][PNG bytes]
```

Big-endian because it is the network order, and because it costs neither end
anything: `DataView.getUint32(0)` is big-endian by default, so the browser
passes no flag.

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

**Measured** by `mock-server.py --measure 150`, packing the two finished
hybrid renders into 256×192 frames:

| payload                        | bytes/frame | at 12 fps     |
| ------------------------------ | ----------- | ------------- |
| raw Float32 depth alone        | 196,608     | 18.9 Mbps     |
| raw 8-bit, three channels      | 147,456     | 14.2 Mbps     |
| **PNG, three channels packed** | **12,600**  | **1.21 Mbps** |

Better than the 21KB the sketch projected — 11.7× smaller than raw rather
than 7× — and the encode itself runs at ~290fps single-threaded, well clear
of any rate this will ever send at. Almost none of the margin is the
letterbox padding a 16:9 asset gets fitted into a 4:3 frame with: at 256×144
with no padding at all the same content packs to 11,187 bytes. The number to
carry forward is ~12.5KB/frame, and the reason to re-measure on the phone is
that a real room is noisier than a rendered depth map, not that the geometry
changes.

Lossless, and decoded natively by the browser via `createImageBitmap`,
which is async and off the main thread — the reason PNG is affordable at
all. At any rate this stream will ever run it is far below what any link
here carries, so there is no reason to reach for a lossy codec — and a
positive reason not to.

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
  frame rate, resolution, and ARKit tracking state, plus a notice when the
  header says the mask is missing. Far/Near are relabelled in metres and
  stepped across the header's own window at 0.1 m. Everything else — bands,
  environment gradient, person color, auto-dim, agitate — carries over
  unchanged.
- **No scrubber.** There is no timeline to seek. The Scrubber, the preview
  video, playback rate and sound all come out.

Three things the sketch didn't anticipate, all found in the build:

- **The held frame outlives the socket.** It has to: a dropout, a
  disconnect and a URL edit all tear the socket effect down, and the last
  good frame has to survive all three — not only to stay on screen, but so
  that changing a color in the panel still reaches the engine while nothing
  is arriving. During setup, that is most of the time anyone spends in the
  panel. The frame buffers and the last header therefore live in refs at
  component scope, not in the effect's closure.
- **Connection status is pushed on a timer, not per frame.** A `setState`
  per frame would re-render the panel twelve times a second to move a
  number only a human reads. Twice a second, and only when something
  changed.
- **`127.0.0.1`, not `localhost`, is the default URL.** `iproxy` and any
  local mock bind IPv4; browsers resolve `localhost` to `::1` first. If
  anything else is listening on the IPv6 loopback at the same port — a dev
  server, say — it silently wins the name and the socket goes to the wrong
  process. This is not hypothetical: it happened on the first run here,
  against this project's own Vite server. Naming the family removes the
  ambiguity, and it is equally correct for both transports.

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

[mock-server.py](../src/cinema/lidar/mock-server.py) replays the hybrid
variation's finished renders as packed RGB frames over the identical
protocol, synthesizing a confidence channel the offline pipeline has no
equivalent for (high everywhere, knocked down at depth discontinuities and
at range — the two things that actually cost a LiDAR sensor certainty).

Two ffmpeg pipes read in lockstep, both resampled to a common frame rate
first so a stand-in at a different rate stays in register. The 16:9 assets
are letterboxed into 256×192 rather than squashed, because the engine
letterboxes onto its grid anyway and a real 4:3 depth map will do the same.

Its flags exist to make the failure modes reachable, since none of them can
be provoked by unplugging something that doesn't exist yet:

| flag                          | what it exercises                                  |
| ----------------------------- | -------------------------------------------------- |
| `--measure N`                 | the bytes/frame table above, on the current assets |
| `--no-mask`                   | the `channels.mask: false` degrade path            |
| `--drop-every S --drop-for S` | auto-reconnect, backoff, hold-the-last-frame       |
| `--tracking-cycle S`          | the panel's tracking readout                       |
| `--fps N`                     | drop-don't-queue, by sending faster than the sim   |

This is the same approach that worked for the hybrid variation, where
placeholder assets let the variation be built and checked while its real
render was still hours away. It also leaves a permanent regression harness
that needs no hardware.

### What it verified

All against the mock, at 256×192:

- The channel split is exact: depth and mask arrive at the engine with R=G=B
  replicated and alpha opaque, the mask holding only 0 and 255.
- Depth orientation is right way up — person pixels read a mean nearness of
  **141.8** against **45.8** for everything else, the same check the hybrid
  pair passed with "+47.4 luma nearer than the frame median".
- Far/Near in metres reach the engine correctly: 2.0 m on a 0.5–5.0 m
  window sets the engine's luma window to 170, matching the arithmetic.
- **Drop-don't-queue holds.** Fed at 30fps the panel reports 29.7fps
  received while applies cap at ~9/s, and the age of the most recently
  applied frame stays flat at 13–129 ms over 15 seconds. A backlog would
  have shown as that number climbing without bound; it doesn't.
- Dropouts hold the last frame rather than going black — the thumbnail's
  content freezes at an identical value for the whole outage — and recover
  well inside a 6 s outage.
- With `--no-mask`, the panel says so and the engine reports
  `isImageOverlayEnabled() === false`: bands only, no half-applied overlay.
- A person-color change made while **disconnected** still reaches both the
  engine and the thumbnail.

## Robustness for a live show

Built and checked against `--drop-every`:

- **Auto-reconnect** with backoff — 500 ms doubling to a 5 s cap, reset on
  every successful open. It starts fast because the overwhelmingly common
  case is the server not being up _yet_ during setup, and caps low because
  five seconds is already a long time to stand on a stage wondering.
- **Hold the last good frame** on dropout rather than going black. A frozen
  image reads as a held moment; a black screen reads as a failure.
- **Connection state visible** in the panel, since the failure will happen
  during setup, not during the piece. "Reconnecting — holding last frame"
  is spelled out, because a frozen picture is otherwise indistinguishable
  from a working one that isn't moving.

Still ahead:

- **Prefer USB when it matters.** It is lower latency, immune to a room
  full of contending phones, and charges the device — which also removes
  the battery question for a long set. Wireless is the fallback, not the
  default. If wireless is used, put the Mac on the **phone's Personal
  Hotspot** rather than venue WiFi: a direct link with no router, no DHCP
  surprises, and no audience contention.
- **Keep the screen awake** (`isIdleTimerDisabled`) — a suspended app stops
  producing frames.
- **Serve the page over plain http.** The deploy target is an S3 website
  endpoint, which is http-only, so `ws://` works from it today. Putting the
  site behind CloudFront (i.e. https) would make every frame socket a
  mixed-content block, with no localhost exemption for WebSockets. If the
  site ever moves to https, this variation needs `wss://` and a certificate
  on the phone — a real cost, worth knowing before rather than after.

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
- **What to do with the confidence channel.** Transmitted and decoded from
  the start because it is free, but consumed by nothing in v1. It is a map of where
  the sensor is unsure — edges, dark or shiny surfaces, distance — which is
  neither geometry nor semantics and sits on no tier of the existing
  ladder. Worth playing with once there is something to look at.

## Build order

1. ~~**Protocol + mock server.**~~ **Done** —
   [mock-server.py](../src/cinema/lidar/mock-server.py).
2. ~~**`src/cinema/lidar/`** forked from `hybrid/`~~ **Done** — socket hook,
   channel split, panel Connection section, scrubber removed; verified end
   to end against the mock (see _What it verified_ above). Registered in
   [variants.js](../src/cinema/variants.js) as "LiDAR (live)".
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
