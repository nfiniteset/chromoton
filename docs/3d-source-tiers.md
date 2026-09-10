# Interpreting video into 3D as a sim source

## The idea

Cinema currently feeds the sim a video directly: each cell reads the luma
of the pixel under it and takes one of two target colors. The source is a
picture, and the only thing the sim can learn from it is brightness.

The alternative is to analyse the footage first — into depth, into body
parts, into a posed 3D skeleton — and render an **intermediate video whose
channels carry meaning rather than photographic luma**. Distance from
camera, which dancer a pixel belongs to, which limb, how fast it's moving.
The sim then assigns target colors from _that_, so color is driven by
something about the scene rather than by how brightly it happened to be
lit.

## Why this is worth doing

Two reasons, and the second is the one that actually motivated it.

**It unlocks signals the footage doesn't contain.** "Color by depth" or
"color by dancer" is not expressible from luma at any threshold.

**It fixes a convergence problem we already hit.** The 2026-09
motion-detection experiment produced a correct-looking source that read as
sparse and dark in the sim. The diagnosis (see PLAN.md) was that the source
flickered between 0 and 255 with a different spatial pattern nearly every
frame, so cells never got a stable target to converge toward. A render out
of an analysed scene is the opposite: smooth, spatially coherent,
temporally stable, free of sensor noise. The 3D detour is therefore not
only an aesthetic move — it is the fix for a dynamics problem the sim has
already demonstrated.

This is also why every tier below treats **temporal stability as a
first-class requirement**, not a polish step. A per-frame model run
frame-by-frame will flicker; the work is in stopping that.

## What had to change in the engine

The blocker was never the computer vision. It was that
`setImageTargets`/`sampleImageMask` in [chromoton.js](../chromoton.js)
reduce the source to **one bit per cell** — above or below a luma cutoff —
and then pick white or black. No amount of source quality gets a third
color through that.

`setImageTargetsIndexed(imgData, palette)` (added for Tier 0) quantizes
luma into one band per palette entry instead, so a source can drive N
target colors. `setImageDepthRange(far, near)` narrows which slice of the
source's range gets spread across those bands.

That one addition serves every tier, because it handles both kinds of
signal:

- **Ordered** (depth): bands are slices of a continuous quantity, and the
  palette is a ramp.
- **Categorical** (body part, dancer identity): the preprocessing writes
  each class at the luma sitting at the _centre_ of its band, so
  quantizing with `bands == class count` recovers the class exactly, with
  half a band of headroom against compression. The palette is then a set of
  distinct colors rather than a ramp.

Nothing further is needed engine-side for Tiers 1-2. What changes per tier
is what produces the intermediate video.

## The ladder

Each rung is independently useful and independently shippable. They are
ordered by cost, not by quality — Tier 2 is not "better", it buys a
different thing (authorship).

### Tier 0 — depth ✅ built

**Variation:** `src/cinema/depth-map/`

Run a monocular depth model over the footage, output a grayscale video
where brightness is distance from camera, feed it in with an ordered ramp.
No 3D model, no rig, no pose estimation. If "color by depth" is the goal,
this is the entire feature.

**Model:** Depth Anything V2 **Small** (Apache-2.0). Chosen while the
project's commercial status was open; Large is available too now (see
Licensing) if depth quality ever proves limiting.

**Stability:** the two smoothers in
[preprocess-depth.py](../src/cinema/depth-map/preprocess-depth.py) matter
more than the model choice. Normalization bounds are EMA'd percentiles
rather than per-frame min/max — this is what stops the whole image pumping
in brightness as the scene's depth extremes move — plus a light EMA on the
depth itself. A temporally-consistent video depth model (Video Depth
Anything, DepthCrafter) would do this better at the cost of a much heavier
pipeline; the EMAs were enough here.

### Tier 1 — per-pixel semantics ✅ built

**Variation:** `src/cinema/segments/`

Instead of "how far away", label _what each pixel is_: a dancer, or not.
Flat regions of pure class, no gradient. Feeds the same indexed path with a
categorical palette.

**Model:** DETR ResNet-50 panoptic (Apache-2.0). Gives both "stuff"
(floor, stairs, walls) and "things" (person instances) in one pass, and
detects the dancers in this footage confidently.

**Output is binary:** dancers white, scene and background alike black —
only the person / not-person distinction is kept.

**Stability:** an earlier revision gave each dancer their own color, which
needed cross-frame identity the model does not provide — DETR's instance
ids are arbitrary per frame. That was handled with greedy IoU tracking into
stable slots, which held within a shot but **reassigned every dancer's
color at each cut**, because mask overlap cannot survive an edit. Fixing it
properly would mean appearance-based re-identification, a substantially
larger piece of work.

Collapsing to a single "dancer" class removes the problem outright rather
than mitigating it: with no identity to keep, there is nothing to lose at a
cut. It also lifts the old cap on simultaneous dancers — any number of
detected people are simply white. If per-dancer color is ever wanted back,
the tracker is in this file's git history, and the re-identification caveat
above is why it was not kept.

**On model choice:** DETR panoptic was picked while the project's
commercial status was still open, since it is Apache-2.0 and needed no such
decision. That question is now settled (non-commercial — see Licensing), so
**Sapiens** and **DensePose** are both available if richer per-pixel body
semantics are ever wanted: Sapiens for 28-part anatomy, DensePose for
continuous body-surface UV. Either would slot into this variation with only
the preprocessing script changed, since the engine side is agnostic to what
the classes mean. DETR stays the default because it works and is verified,
not because anything rules the others out.

### Tier 2 — posed 3D bodies ⬜ not started

Estimate pose, drive a body model, render the scene yourself.

- **MediaPipe Pose Landmarker** (Apache-2.0) — 33 landmarks, easy,
  in-browser. Note: its Python package currently crashes on this Mac
  (`DrishtiMetalHelper ... Service is unavailable`, an Apple Silicon Metal
  issue), so the browser is the practical route.
- **4D-Humans / HMR2.0**, **SMPLer-X** — real SMPL/SMPL-X body meshes,
  far better 3D, realistically want a rented CUDA box.
- 2D-lifted pose (VideoPose3D, MotionBERT) gives _root-relative_ 3D — good
  for limb geometry, useless for "how far is this person from camera". Get
  depth from a depth model, not from pose.

**Render buffers, not pictures.** Blender's render passes give the semantic
channels directly: **Z** (depth), **Cryptomatte / Object Index** (part or
person id), **Normal** (surface orientation as RGB). Normals→hue is
especially good and free — it encodes which way a surface faces, which no
flat video can express.

**The real payoff is authorship, not fidelity.** Once the scene is 3D you
control the camera, the timing, and the cast: orbit the dancers, push in,
cut between angles, slow one dancer while another runs, duplicate a figure,
exaggerate a joint. That, not realism, is what Tier 2 buys.

**Skip the video file entirely.** `fromCanvas()` in
[src/utils/imageSource.ts](../src/utils/imageSource.ts) already accepts a
live-updating canvas — it is documented for exactly this. A Three.js scene
rendering offscreen feeds the existing path with **zero new plumbing**
(swap `fromVideoElement` in a variation's `useVideoImageMode.ts`). That
means live camera control during a performance, and shipping motion data —
a few hundred KB of joint transforms — instead of a video file.

Practical hybrid: bake the motion capture offline on rented GPU, ship the
motion data, render live in the browser.

## Other signals worth reaching for

Once the scene is analysed, the target-color signal can be anything the
representation exposes:

- distance from camera · distance from a moving focal point
- body part · dancer identity · limb velocity (fast joints hot, still ones cold)
- surface normal / facing direction · height above floor · floor contact
- time since a cell was last touched — a decay trail in 3D rather than the
  2D `tblend` trail built for 2026-09

## Licensing

Checked 2026-09-05. Licenses change; re-verify before shipping.

| Tool                                                 | License          | Commercial? |
| ---------------------------------------------------- | ---------------- | ----------- |
| Depth Anything V2 **Small**                          | Apache-2.0       | yes         |
| Depth Anything V2 Base/Large/Giant                   | CC-BY-NC-4.0     | **no**      |
| DETR (incl. panoptic)                                | Apache-2.0       | yes         |
| MediaPipe                                            | Apache-2.0       | yes         |
| SAM 2                                                | Apache-2.0       | yes         |
| ViTPose / MMPose / RTMPose                           | Apache-2.0       | yes         |
| Blender / Three.js / ffmpeg                          | GPL / MIT / LGPL | yes         |
| Sapiens v1                                           | CC-BY-NC-4.0     | **no**      |
| SMPL / SMPL-X (and 4D-Humans, HMR2.0, SMPLer-X, OSX) | non-commercial   | **no**      |
| OpenPose / AlphaPose                                 | non-commercial   | **no**      |

**Settled 2026-09-06: this project is non-commercial** — a personal art
project and technical exploration, not a ticketed, sponsored or
commissioned event. That resolves the question that was gating the ladder.
SMPL's academic license explicitly permits _non-commercial artistic
projects_, and CC-BY-NC covers the rest, so **every row in the table above
is available**, including those marked "no" for commercial use:

- **Sapiens** — 28-part body segmentation plus depth and normals from one
  model family; the obvious upgrade for Tier 1 if per-limb anatomy is
  wanted.
- **DensePose** — per-pixel body-surface UV, a continuous "where on the
  body am I" signal that maps naturally to hue.
- **Depth Anything V2 Large** — could replace Small in Tier 0 if depth
  quality ever proves limiting.
- The whole **SMPL family** (4D-Humans, HMR2.0, SMPLer-X) for Tier 2.

The Apache-2.0 choices already made remain the right defaults — they work,
they are verified, and they keep the door open if the project's status ever
changes — but nothing is blocked any more. Revisit this only if the work
becomes commissioned or ticketed.

Note also that Meshcapade, SMPL's commercial licensor, was acquired by Epic
in early 2026 — commercial terms there should be treated as unsettled.

Only real cash cost anywhere on the ladder is rented GPU for Tier 2 mocap:
roughly $0.30-0.70/hr for a 4090, a few dollars per clip.
