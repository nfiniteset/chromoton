#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "torch",
#   "torchvision",
#   "transformers",
#   "numpy",
#   "pillow",
# ]
# ///
"""Depth-map preprocessing for the depth-map cinema variation.

Converts a source video into a grayscale depth video: each pixel's
brightness is its distance from camera, near = bright. That video is then
fed to the sim in indexed image mode (chromoton.js's
setImageTargetsIndexed), where luma bands pick target colors — so color
ends up driven by depth rather than by the footage's own brightness.

Model is Depth Anything V2 **Small**, which is Apache-2.0. The Base, Large
and Giant checkpoints are CC-BY-NC-4.0, so don't swap one in without
deciding the licensing question first (see PLAN.md).

Temporal stability is the whole point of the extra machinery here. Running
a single-image depth model frame by frame and normalizing each frame on its
own min/max produces output that flickers badly — the same surface changes
brightness frame to frame as the scene's depth extremes move around. That
reproduces exactly the failure the motion-detection preprocessing hit (see
PLAN.md): a source that never holds still gives cells no stable target to
converge toward. Two smoothers address it:

  * normalization bounds are per-frame percentiles smoothed with an EMA
    across frames, so the mapping from depth to brightness drifts slowly
    instead of being re-derived per frame; and
  * the depth map itself gets a light EMA against the previous frame.

Usage:
  ./preprocess-depth.py <input> <output.mp4> [options]

Options:
  --width N        processing/output width in px (default 640; height
                   follows the source's *display* aspect, rounded to even
                   for yuv420p)
  --fps N          output frame rate (default: the source's)
  --smooth A       depth EMA weight on the current frame, 0-1 (default
                   0.6; lower = steadier but smears fast movement)
  --norm-smooth A  EMA weight for the normalization bounds (default 0.05 —
                   deliberately slow, this is what stops global flicker)
  --percentile P   low/high percentile for those bounds (default 2.0,
                   i.e. clip at 2% and 98% to ignore outlier pixels)
  --batch N        frames per forward pass (default 8)
  --limit SEC      only process the first SEC seconds (for quick tests)
  --invert         far = bright instead of near = bright
"""

import argparse
import json
import subprocess
import sys

import numpy as np
import torch
from transformers import AutoImageProcessor, AutoModelForDepthEstimation

MODEL_ID = "depth-anything/Depth-Anything-V2-Small-hf"


def probe(path):
    """Source width, height, frame rate and *display* aspect ratio.

    Display aspect matters because the footage can be anamorphic — the
    2026-09 placeholder stores 320x256 with a 64:45 sample aspect, i.e. it
    displays as 16:9. Deriving output height from the stored dimensions
    alone would hand the model (and the sim) a vertically squashed frame.
    """
    out = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries",
            "stream=width,height,r_frame_rate,sample_aspect_ratio",
            "-of", "json", path,
        ],
        capture_output=True, text=True, check=True,
    ).stdout
    stream = json.loads(out)["streams"][0]
    width, height = int(stream["width"]), int(stream["height"])

    num, den = stream["r_frame_rate"].split("/")
    fps = float(num) / float(den) if float(den) else 24.0

    sar = stream.get("sample_aspect_ratio") or "1:1"
    sar_num, sar_den = 1.0, 1.0
    if ":" in sar:
        parsed_num, parsed_den = sar.split(":")
        # ffprobe reports "0:1" when the sample aspect is simply unknown.
        if float(parsed_den) and float(parsed_num):
            sar_num, sar_den = float(parsed_num), float(parsed_den)

    display_aspect = (width * sar_num) / (height * sar_den)
    return width, height, fps, display_aspect


def pick_device():
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def read_frames(path, width, height, limit):
    """Yield HWC uint8 RGB frames decoded by ffmpeg through a pipe."""
    cmd = ["ffmpeg", "-v", "error"]
    if limit:
        cmd += ["-t", str(limit)]
    cmd += [
        "-i", path,
        # setsar=1 so the scaled frames are square-pixel — width/height here
        # are already display-corrected, and without this ffmpeg would carry
        # the source's anamorphic sample aspect through.
        "-vf", f"scale={width}:{height},setsar=1",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    frame_bytes = width * height * 3
    try:
        while True:
            buf = proc.stdout.read(frame_bytes)
            if len(buf) < frame_bytes:
                return
            yield np.frombuffer(buf, np.uint8).reshape(height, width, 3).copy()
    finally:
        proc.stdout.close()
        proc.wait()


def infer_batch(model, processor, device, frames):
    """Raw (unnormalized) predicted depth for a batch, at frame resolution."""
    height, width = frames[0].shape[:2]
    inputs = processor(images=list(frames), return_tensors="pt").to(device)
    with torch.no_grad():
        predicted = model(**inputs).predicted_depth
    resized = torch.nn.functional.interpolate(
        predicted.unsqueeze(1), size=(height, width),
        mode="bicubic", align_corners=False,
    ).squeeze(1)
    return resized.float().cpu().numpy()


def main():
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--fps", type=float, default=None)
    parser.add_argument("--smooth", type=float, default=0.6)
    parser.add_argument("--norm-smooth", type=float, default=0.05)
    parser.add_argument("--percentile", type=float, default=2.0)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--limit", type=float, default=None)
    parser.add_argument("--invert", action="store_true")
    args = parser.parse_args()

    src_w, src_h, src_fps, display_aspect = probe(args.input)
    # yuv420p needs even dimensions on both axes.
    width = args.width - (args.width % 2)
    height = int(round(width / display_aspect))
    height -= height % 2
    fps = args.fps or src_fps

    device = pick_device()
    print(
        f"source {src_w}x{src_h} (displays {display_aspect:.3f}:1) "
        f"@ {src_fps:.3f}fps",
        file=sys.stderr,
    )
    print(f"output {width}x{height} @ {fps:.3f}fps on {device}", file=sys.stderr)

    processor = AutoImageProcessor.from_pretrained(MODEL_ID)
    model = AutoModelForDepthEstimation.from_pretrained(MODEL_ID).to(device).eval()

    encoder = subprocess.Popen(
        [
            "ffmpeg", "-y", "-v", "error",
            "-f", "rawvideo", "-pix_fmt", "gray",
            "-s", f"{width}x{height}", "-r", f"{fps}",
            "-i", "-",
            "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p",
            args.output,
        ],
        stdin=subprocess.PIPE,
    )

    # Running state for the two smoothers: EMA'd normalization bounds, and
    # the previous frame's normalized depth.
    low = high = None
    previous = None
    written = 0

    def flush(batch):
        nonlocal low, high, previous, written
        for depth in infer_batch(model, processor, device, batch):
            frame_low, frame_high = np.percentile(
                depth, [args.percentile, 100.0 - args.percentile]
            )
            if low is None:
                low, high = frame_low, frame_high
            else:
                a = args.norm_smooth
                low = (1 - a) * low + a * frame_low
                high = (1 - a) * high + a * frame_high

            span = max(high - low, 1e-6)
            normalized = np.clip((depth - low) / span, 0.0, 1.0)

            if previous is None:
                previous = normalized
            else:
                previous = args.smooth * normalized + (1 - args.smooth) * previous

            out = previous
            # The model predicts inverse depth, so near is already bright.
            if args.invert:
                out = 1.0 - out
            encoder.stdin.write((out * 255.0).astype(np.uint8).tobytes())
            written += 1
            if written % 100 == 0:
                print(f"  {written} frames", file=sys.stderr)

    batch = []
    for frame in read_frames(args.input, width, height, args.limit):
        batch.append(frame)
        if len(batch) == args.batch:
            flush(batch)
            batch = []
    if batch:
        flush(batch)

    encoder.stdin.close()
    encoder.wait()
    print(f"wrote {written} frames to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
