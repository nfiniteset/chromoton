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
"""Person-mask preprocessing for the hybrid cinema variation.

Writes a plain black/white video: white wherever a person is, black
everywhere else. The hybrid variation feeds this to the engine as the
*overlay* source alongside a depth video — cells whose overlay pixel is at
or above 128 take the person target color, everything else takes its depth
band. See docs/hybrid-pipeline.md.

Deliberately simpler than the segments variation's script, in two ways:

  * **Plain 0/255, not class centres.** Segments has to smuggle labels
    through the engine's indexed *luma* path, so it writes each class at
    the luma sitting at its quantization band's centre. A dedicated video
    needs none of that — there is one bit to carry and a whole channel to
    carry it in.
  * **No stride.** Segments keeps every 3rd frame because DETR ran at
    ~1.7fps. This runs at ~4.4fps, so the full piece renders at its native
    25fps in about two hours and the mask stops being the temporally crude
    half of the pair.

Model is Mask2Former Swin-Large (COCO panoptic), replacing DETR
ResNet-50. On this footage DETR blobs the torsos and loses every
outstretched arm — which is most of the choreography — while Mask2Former
keeps them to the fingertips, and is about 2.5x faster besides. DETR was
picked while the project's commercial status was still open; that was
settled non-commercial (see docs/3d-source-tiers.md), so nothing rules out
the better model any more.

Loading prints a LOAD REPORT naming a few UNEXPECTED
`relative_position_index` buffers and two MISSING `swin.layernorm` keys.
That is benign — a checkpoint/architecture mismatch in unused parameters,
not a broken load.

There is no temporal smoothing. The signal is a hard binary label, so an
EMA would only produce intermediate values that the threshold below
re-binarizes anyway. If per-frame flicker shows up (a dancer found in one
frame and missed in the next), that is a model or confidence-threshold
problem, not something a filter here should paper over.

Usage:
  ./preprocess-people.py <input> <output.mp4> [options]

Options:
  --width N      *inference* width in px (default 1024; height follows the
                 source's *display* aspect, rounded even for yuv420p)
  --out-width N  delivered width in px (default 640). Area-averaged down
                 from --width, then majority-voted back to binary.
  --batch N      frames per forward pass (default 2)
  --threshold F  panoptic segment confidence cutoff (default 0.5)
  --start SEC    skip SEC seconds of the source before starting
  --limit SEC    only process SEC seconds (for quick tests)
"""

import argparse
import json
import subprocess
import sys

import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, Mask2FormerForUniversalSegmentation

MODEL_ID = "facebook/mask2former-swin-large-coco-panoptic"

# What the engine's overlay decoder compares against. Output is 0 or 255, so
# this has 127 levels of headroom either way and h264 cannot reach it.
DECODE_THRESHOLD = 128


def probe(path):
    """Source width, height, frame rate and *display* aspect ratio.

    Display aspect matters because the footage is anamorphic — the DVD
    source stores 720x576 with a 64:45 sample aspect, i.e. it displays as
    16:9. Deriving output height from the stored dimensions alone would
    hand the model a vertically squashed frame.
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


def read_frames(path, width, height, limit, start=None):
    """Yield HWC uint8 RGB frames decoded by ffmpeg through a pipe."""
    cmd = ["ffmpeg", "-v", "error"]
    if start:
        cmd += ["-ss", str(start)]
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


def downscale_mask(mask, width, height):
    """Area-average a boolean mask down, then majority-vote back to binary.

    Averaging first gives each output pixel the *fraction* of it a person
    covers; thresholding that at half puts the silhouette on its true
    boundary, where picking one arbitrary source pixel (what the engine
    itself would do — sampleImageIndices point-samples) leaves a staircase.
    Feathering that edge instead was considered and rejected: it would need
    a blend path in the engine, and the sim's own convergence already
    softens cell edges.
    """
    if mask.shape[1] == width and mask.shape[0] == height:
        return np.where(mask, 255, 0).astype(np.uint8)
    coverage = np.asarray(
        Image.fromarray(mask.astype(np.float32), mode="F")
        .resize((width, height), Image.BOX)
    )
    return np.where(coverage >= 0.5, 255, 0).astype(np.uint8)


def main():
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--out-width", type=int, default=640)
    parser.add_argument("--batch", type=int, default=2)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--start", type=float, default=None)
    parser.add_argument("--limit", type=float, default=None)
    args = parser.parse_args()

    src_w, src_h, src_fps, display_aspect = probe(args.input)
    # yuv420p needs even dimensions on both axes.
    width = args.width - (args.width % 2)
    height = int(round(width / display_aspect))
    height -= height % 2
    # The delivered size is chosen against the sim's cell grid, not against
    # the source — at max clarity the grid is 640x360, so anything larger is
    # detail the engine samples past.
    out_width = min(args.out_width, width) - (min(args.out_width, width) % 2)
    out_height = int(round(out_width / display_aspect))
    out_height -= out_height % 2

    device = pick_device()
    print(
        f"source {src_w}x{src_h} (displays {display_aspect:.3f}:1) "
        f"@ {src_fps:.3f}fps",
        file=sys.stderr,
    )
    print(f"inference {width}x{height} on {device}", file=sys.stderr)
    print(f"output {out_width}x{out_height} @ {src_fps:.3f}fps", file=sys.stderr)

    processor = AutoImageProcessor.from_pretrained(MODEL_ID)
    model = Mask2FormerForUniversalSegmentation.from_pretrained(MODEL_ID).to(device).eval()
    person_label = next(
        i for i, name in model.config.id2label.items() if name == "person"
    )

    encoder = subprocess.Popen(
        [
            "ffmpeg", "-y", "-v", "error",
            "-f", "rawvideo", "-pix_fmt", "gray",
            "-s", f"{out_width}x{out_height}", "-r", f"{src_fps}",
            "-i", "-",
            "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p",
            # Flat regions with hard edges must survive encoding intact, so
            # keep the quantizer low — the 0/255 levels tolerate plenty of
            # drift, but edges ring badly at default quality.
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
            mask = np.zeros((height, width), dtype=bool)
            # Every person is one class — no instance identity is kept, so
            # there is nothing to lose at a cut and no cap on how many
            # dancers can appear at once.
            for info in result["segments_info"]:
                if info["label_id"] == person_label:
                    mask |= seg == info["id"]

            encoder.stdin.write(downscale_mask(mask, out_width, out_height).tobytes())
            written += 1
            if written % 100 == 0:
                print(f"  {written} frames", file=sys.stderr)

    batch = []
    for frame in read_frames(args.input, width, height, args.limit, args.start):
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
