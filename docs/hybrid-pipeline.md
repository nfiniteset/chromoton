# Hybrid pipeline: depth environment + person overlay

Design settled 2026-09-10. Not built yet. Companion to
[3d-source-tiers.md](3d-source-tiers.md), which this draws Tiers 0 and 1
together into one variation; PLAN.md carries the terse task entry.

## The idea

Tier 0 colors every cell by distance from camera. Tier 1 colors every cell
by whether it is a dancer. Neither can say both things at once, because
each one owns the single signal the engine reads.

This variation runs both: **depth drives a configurable gradient across the
environment, and people are lifted out of it into their own configurable
target color on top.** The room recedes in a ramp you set at both ends; the
dancers read as a flat shape against it, dimmable independently of the
scene behind them.

## Two videos, not one baked asset

Two signals have to reach the same cell. There are two ways to do that and
both were prototyped.

**One baked video.** Hide both signals in one grayscale channel by
splitting the luma range: environment depth in 0-160, an unused guard band
in 161-215, people in 216-255. A generalisation of the class-centre trick
the Segments variation already uses. Verified through h264 at crf 14:
**0.0044% of pixels misclassify**, and 58% of those sit on a silhouette
edge where a sub-cell fringe is invisible. It works.

**Two videos.** Ship depth and the person mask as separate files, sample
both per cell, person wins. The obvious objection is drift, so it was
measured in Chrome against the two assets already on disk: **0.1 ms drift
over 30 s** at 0.25x playback, and **≤12 ms skew after a seek** — under a
third of a source frame. Sync is not a real problem.

Two videos wins, on three counts:

- **No encoding contract.** The baked route puts a luma slab layout in a
  Python script and a matching decoder in JavaScript, with nothing but a
  comment holding them together. Segments already carries one such contract
  and documents it carefully; a second is a second thing to break.
- **Independent re-rendering.** Depth and people can be re-rendered, retuned
  or replaced one at a time.
- **Independent resolution and frame rate.** Depth infers at 7.4 fps and
  people at 4.4 fps. Baking them together forces one rate on both, so the
  cheap signal gets throttled to the expensive one's budget or the
  expensive one gets a held mask baked in permanently.

The baked encoding is verified and documented here in case the second video
ever becomes a problem. One detail worth keeping from it: if you do bake,
write person _depth_ into the person slab even while painting people flat,
so a per-person ramp costs no re-render.

## The pipeline

### Source

`public/cinema/2026-08-forsythe/media/forsythe_one_flat_thing_reproduced.VOB`
— 720x576 at SAR 64:45, which displays as **1024x576**.

This matters more than anything else here. Every existing derived asset was
built from `forsythe_one_flat_thing_reproduced.mp4`, which is **320x256** —
a roughly 5x decimation of a file sitting in the same folder. Depth
rendered from the DVD resolves arms, table legs and overlapping figures
that the current assets blur into one mass.

`ffprobe` reports `field_order=tt`, but `idet` finds 150/150 frames
progressive. It is progressive content in a PAL container. **No
deinterlacing**, and no 50 fields/sec to recover.

Decode with `scale=1024:576,setsar=1`.

### Depth

Existing [preprocess-depth.py](../src/cinema/depth-map/preprocess-depth.py)
at `--width 1024`, otherwise unchanged. Keep both EMAs — the smoothed
normalization bounds are what stop global brightness flicker, and that
failure mode is the whole reason the script has the machinery it has.

Depth Anything V2 Small, **7.37 fps** measured at native res → **1.19 h**
for the full 21-minute piece at 25 fps.

### People

New `preprocess-people.py`, same skeleton as the depth script.

**`facebook/mask2former-swin-large-coco-panoptic`**, batch 2, replacing
DETR ResNet-50. On this footage DETR blobs the torsos and drops every
outstretched arm — which is most of the choreography in _One Flat Thing,
reproduced_ — and leaves ragged holes. Mask2Former keeps the arms to the
fingertips, cleanly. It is also **~2.5x faster** at native resolution, so
the swap costs nothing.

**4.35 fps** measured → **2.01 h** at 25 fps.

Output is plain 0/255. A dedicated video needs none of the class-centre
luma encoding that Segments uses to smuggle labels through the indexed
path. No stride, no tracker.

Licensing stopped constraining this choice when the project was settled
non-commercial (see [3d-source-tiers.md](3d-source-tiers.md#licensing));
DETR was picked while that question was still open. Sapiens is the next
rung up if per-limb anatomy is ever wanted.

### Downscale

Infer at 1024x576, deliver at **640x360**, downscaling by **area
averaging**.

The delivered size is chosen against the grid, not against the video: at
max clarity the sim is 640x360 cells, so anything larger is bytes the
engine samples past. It is 1.33 source px per cell at the default clarity
of 480.

The averaging is the part that matters. `sampleImageIndices` point-samples
(`sx | 0`), and area-averaging _inside_ the engine was measured and gains
nothing — 9.18% vs 9.23% of cells changing band per frame. So the
downscale is the only place the native-resolution gain can be banked, and
it has to happen offline.

The mask downscales the same way and is then **majority-voted back to
binary** at 128, which puts the silhouette on its true boundary instead of
a nearest-neighbour staircase.

### Frame rate

**25 fps, no stride, both videos.**

`--stride 3` existed only because DETR ran at 1.7 fps. At Mask2Former's
throughput the full-rate render is ~3.2 h for both signals — one overnight
run — and both assets then share the source timeline exactly, so neither
script needs stride bookkeeping.

15 fps was considered and is not cleanly reachable: from a 25 fps source,
uniform strides give 25 / 12.5 / 8.33, and 15 means keeping 3 of every 5
frames at uneven 40/40/80 ms spacing. Judder for no gain.

### Cost

|                         | throughput | full render | asset  |
| ----------------------- | ---------- | ----------- | ------ |
| Depth Anything V2 Small | 7.37 fps   | 1.19 h      | ~70 MB |
| Mask2Former Swin-L      | 4.35 fps   | 2.01 h      | ~70 MB |

Measured on an M1 Pro at 1024x576 over 500 frames. Sizes are for 640x360
at 25 fps and are approximate — they were extrapolated from a 20 s slice.

## Engine changes

Additive, per the standing convention in
[src/cinema/README.md](../src/cinema/README.md) — existing variations must
keep working unmodified.

**An optional third argument to `setImageTargetsIndexed`:**

```js
setImageTargetsIndexed(imgData, palette, overlay)
// overlay?: { data: ImageData, color: Color, threshold: 128 }
```

Omitted, behaviour is exactly what it is today, so Depth map and Segments
are untouched. Present, `sampleImageIndices` writes an index one past the
last band for pixels where the overlay source is at or above `threshold`,
and `applyIndexedImageTargets` appends `overlay.color` to the band array.
That is the whole mechanism: the overlay is just an extra band that comes
from a second image rather than from a luma slice.

**Auto-dim on the person color.** `measureAutoDim` currently bails out of
indexed mode wholesale (`if (imagePalette) return`), because auto-dim is
defined against a single white and has no meaning across N bands. That
reasoning does not apply to the overlay, which _is_ a single distinguished
color. Relax the bail for the overlay case only: measure overlay coverage
and dim `overlay.color`, exactly as it dims white today. Auto-threshold
stays out — it still has no meaning here.

**Nothing else.** The environment gradient needs no engine change at all:
`buildDepthPalette(stops, bands)` already interpolates a stop list to any
band count, so making the two stops configurable is a matter of turning
`DEPTH_STOPS` from a constant into state.

## The variation

New folder `src/cinema/hybrid/`, following the recipe in
[src/cinema/README.md](../src/cinema/README.md): `cinema/hybrid/index.html`,
`public/cinema/hybrid/media/`, an entry in `variants.js` with `path:
'cinema/hybrid/'`, and two paths added to `deploy.js`'s
`WHITELISTED_PATHS`.

`useVideoImageMode.ts` forks to drive two video elements and pass the
second as `overlay`.

Panel sections:

- **Depth** — Bands (2-8), Far/Near range, live ramp strip
- **Environment** — far color, near color
- **People** — target color, Auto dim, Dim ceiling + live coverage readout
- **Playback** — speed, sound, thumbnail
- **Simulation** — frame rate, resolution
- **Reset**

Two things to watch while tuning. The Far/Near window matters more here
than in Depth map — in the prototype the far wall collapses into one band
while the floor eats three, so the environment ramp wants narrowing. And
the person color has to stay legible against _every_ environment band once
both gradient stops are user-configurable, which is a real constraint on
the palette; showing the person swatch alongside the ramp strip makes that
visible while tuning rather than after.

## Open question: smoother slow playback

At 0.25x a 25 fps source delivers 6.25 target updates per second. The
sampler throttles to 10/s (`MIN_APPLY_INTERVAL_MS = 100`), so the useful
source rate is **`10 / playback_rate`** — 40 fps at 0.25x, 100 fps at 0.1x.
Frames beyond that are decoded and discarded.

So there is headroom for roughly 2x more frames at 0.25x, and the question
is whether they are worth generating.

**Cheap output-space interpolation was tested and rejected.** Held-out
test: drop every 2nd frame of the finished assets, rebuild it, and score
only the synthesized frames against the real ones they replaced.

| method             | depth band match | person IoU |
| ------------------ | ---------------- | ---------- |
| frame-hold         | 93.89%           | 91.76%     |
| blend              | 95.88%           | 92.21%     |
| `minterpolate=mci` | **96.44%**       | **93.49%** |

`mci` wins both metrics and is visibly the worst of the three: it shreds
limbs into blocky fragments, detaches a hand into a floating blob, and
notches a rectangle out of an arm. Block-based motion estimation cannot
track fast non-rigid limb sweeps, which is the entire content of this
piece. `blend` ghosts. Frame-hold is the only method that stays
anatomically intact — it is merely showing the wrong instant.

The lesson generalises past this decision: **IoU rewards pixel overlap and
is blind to shape integrity.** Do not score a silhouette without looking at
it.

**Decide this after the render, not before.** The 25 fps render is a
prerequisite for every path, so nothing is lost by waiting until it can be
watched at 0.25x in the sim. There is a fair chance the problem does not
exist: the sim is not a video player, and cells converge toward their
targets continuously, so a target held for 160 ms means cells settle
_further_ into it rather than freezing. Stepping lives in the target field;
the rendered output may absorb it. The artifact to look for is silhouette
position jumping, not the gradient.

If it does read as steppy, the fix is **RIFE or FILM on the source** — the
footage has real texture for flow estimation, which the derived depth and
mask channels do not — and then inference on 50 fps. That is ~6.4 h instead
of 3.2 h and changes nothing about the engine, the sim, or the assets'
format. A pure re-render.

## Build order

The render is the long pole, so it starts first and the sim gets built
while it runs.

1. `preprocess-people.py`, and the `--width` / downscale change to
   `preprocess-depth.py`. Verify both on a 20 s slice.
2. Kick off the two full renders. ~3.2 h, backgroundable.
3. Engine: the optional `overlay` argument and the `measureAutoDim`
   relaxation. Testable immediately against the 20 s assets from step 1 —
   this does not wait on step 2.
4. `src/cinema/hybrid/` — app, panel, two-video sampling hook, registration,
   deploy whitelist.
5. Tune the `DEFAULT_*` constants against the finished render.
6. Revisit slow playback with something real to watch.

## Rejected, and why

|                                         | why not                                                                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| One baked video (split luma)            | Works and is verified, but adds a Python↔JS encoding contract and forces one resolution and frame rate on both signals. Kept in reserve. |
| DETR ResNet-50 panoptic                 | Loses every outstretched arm on this footage, and is ~2.5x slower than the model that doesn't.                                           |
| `--stride 3`                            | An artifact of DETR's throughput. Nothing needs it now.                                                                                  |
| 15 fps output                           | Not uniformly reachable from a 25 fps source.                                                                                            |
| 854x480 or native delivery              | Above the grid at max clarity; the engine point-samples the surplus away.                                                                |
| Area-averaging inside the engine        | Measured: no better than the existing point sampling. The averaging has to happen offline, in the downscale.                             |
| Soft-alpha person edges                 | Adds a blend path to the engine and a third state to reason about; the sim's own convergence already softens cell edges.                 |
| `minterpolate` / `blend` on the outputs | Destroys limb shape. See above.                                                                                                          |
| Deinterlacing the VOB                   | `idet` says the content is progressive despite the container flag.                                                                       |
