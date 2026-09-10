#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "torch",
#   "torchvision",
#   "transformers",
#   "numpy",
#   "pillow",
#   "scipy",
#   "timm",
# ]
# ///
"""Panoptic-segmentation preprocessing for the segments cinema variation.

Where the depth-map variation encodes a *continuous* quantity (distance)
and lets the engine slice it into bands, this encodes a *categorical* one:
whether a pixel is a dancer or not. Dancers go white, everything else —
background and the scene's surfaces alike — goes black.

The trick that makes this need no new engine code is the encoding. The
engine's indexed image mode (setImageTargetsIndexed) quantizes luma into
`bands` evenly spaced buckets. So if a class `c` of `NUM_CLASSES` is
written out at the luma value sitting exactly at the *centre* of bucket
`c`, then quantizing with bands == NUM_CLASSES recovers `c` exactly, and
every class centre sits half a bucket clear of the nearest boundary — far
more headroom than h264 needs on flat regions. A continuous ramp and a set
of discrete labels therefore travel through the identical code path; only
the palette's meaning differs (ordered vs. categorical).

Model is DETR ResNet-50 panoptic (facebook/detr-resnet-50-panoptic),
Apache-2.0. Sapiens and DensePose would give richer per-pixel body-part
semantics but are non-commercial and CC-BY-NC respectively — see
docs/3d-source-tiers.md for why that ruled them out.

Every person is the same class, so this needs no cross-frame identity and
carries no tracker. An earlier revision gave each dancer their own color
via greedy IoU matching, which worked within a shot but reassigned colors
at every cut — mask overlap cannot survive an edit. Collapsing to one
"dancer" class removes that failure mode outright rather than papering
over it, and also lifts the old cap on how many dancers could appear at
once: any number of detected people are all simply white.

Usage:
  ./preprocess-segments.py <input> <output.mp4> [options]

Options:
  --width N       processing/output width (default 640; height follows the
                  source's *display* aspect, rounded even for yuv420p)
  --stride N      keep every Nth source frame (default 3). Output frame
                  rate is scaled to match, so the result plays in real time.
                  Inference dominates runtime, so this is the main speed
                  control; the sim samples at <=10Hz and cinema plays at
                  0.25x, so 8fps of source loses nothing visible.
  --short-edge N  model input short edge (default 400; larger is slower
                  and not obviously better on low-res source)
  --batch N       frames per forward pass (default 4 — on MPS, larger
                  batches measured *slower*, not faster)
  --threshold F   panoptic segment confidence cutoff (default 0.5)
  --limit SEC     only process the first SEC seconds (for quick tests)
"""

import argparse
import json
import subprocess
import sys

import numpy as np
import torch
from transformers import AutoImageProcessor, DetrForSegmentation

MODEL_ID = "facebook/detr-resnet-50-panoptic"

# Class 0 is everything that isn't a dancer — background and scene surfaces
# alike — and class 1 is any detected person. Keep this in step with
# segmentPalette.ts, whose length must equal NUM_CLASSES.
CLASS_SCENE = 0
CLASS_PERSON = 1
NUM_CLASSES = 2


def probe(path):
    """Source width, height, frame rate and display aspect (see the
    depth-map script — the placeholder footage is anamorphic)."""
    out = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
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
        if float(parsed_den) and float(parsed_num):
            sar_num, sar_den = float(parsed_num), float(parsed_den)
    return width, height, fps, (width * sar_num) / (height * sar_den)


def read_frames(path, width, height, stride, limit):
    """Yield every `stride`-th decoded RGB frame."""
    cmd = ["ffmpeg", "-v", "error"]
    if limit:
        cmd += ["-t", str(limit)]
    cmd += [
        "-i", path,
        "-vf", f"scale={width}:{height},setsar=1",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    frame_bytes = width * height * 3
    index = 0
    try:
        while True:
            buf = proc.stdout.read(frame_bytes)
            if len(buf) < frame_bytes:
                return
            if index % stride == 0:
                yield np.frombuffer(buf, np.uint8).reshape(height, width, 3).copy()
            index += 1
    finally:
        proc.stdout.close()
        proc.wait()


def main():
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--stride", type=int, default=3)
    parser.add_argument("--short-edge", type=int, default=400)
    parser.add_argument("--batch", type=int, default=4)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--limit", type=float, default=None)
    args = parser.parse_args()

    # Centre of each quantization bucket — see the module docstring.
    levels = np.array(
        [round((c + 0.5) * 255 / NUM_CLASSES) for c in range(NUM_CLASSES)],
        dtype=np.uint8,
    )

    src_w, src_h, src_fps, display_aspect = probe(args.input)
    width = args.width - (args.width % 2)
    height = int(round(width / display_aspect))
    height -= height % 2
    out_fps = src_fps / args.stride

    device = (
        torch.device("mps") if torch.backends.mps.is_available()
        else torch.device("cuda") if torch.cuda.is_available()
        else torch.device("cpu")
    )
    print(f"source {src_w}x{src_h} @ {src_fps:.3f}fps", file=sys.stderr)
    print(f"output {width}x{height} @ {out_fps:.3f}fps on {device}", file=sys.stderr)
    print(f"{NUM_CLASSES} classes at luma {list(levels)}", file=sys.stderr)

    processor = AutoImageProcessor.from_pretrained(
        MODEL_ID,
        size={"shortest_edge": args.short_edge, "longest_edge": args.short_edge * 2},
    )
    model = DetrForSegmentation.from_pretrained(MODEL_ID).to(device).eval()
    person_label = next(
        i for i, name in model.config.id2label.items() if name == "person"
    )

    encoder = subprocess.Popen(
        [
            "ffmpeg", "-y", "-v", "error",
            "-f", "rawvideo", "-pix_fmt", "gray",
            "-s", f"{width}x{height}", "-r", f"{out_fps}",
            "-i", "-",
            "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p",
            # Flat label regions must survive encoding intact, so keep the
            # quantizer low; the class centres tolerate drift but edges
            # ring badly at default quality.
            "-crf", "14", "-preset", "medium",
            args.output,
        ],
        stdin=subprocess.PIPE,
    )

    written = 0

    def flush(batch):
        nonlocal written
        inputs = processor(images=list(batch), return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = model(**inputs)
        results = processor.post_process_panoptic_segmentation(
            outputs,
            target_sizes=[(height, width)] * len(batch),
            threshold=args.threshold,
        )

        for result in results:
            seg = result["segmentation"].cpu().numpy()
            labels = np.full((height, width), CLASS_SCENE, dtype=np.uint8)

            for info in result["segments_info"]:
                if info["label_id"] == person_label:
                    labels[seg == info["id"]] = CLASS_PERSON

            encoder.stdin.write(levels[labels].tobytes())
            written += 1
            if written % 100 == 0:
                print(f"  {written} frames", file=sys.stderr)

    batch = []
    for frame in read_frames(args.input, width, height, args.stride, args.limit):
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
