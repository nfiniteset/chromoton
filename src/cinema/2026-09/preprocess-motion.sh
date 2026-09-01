#!/usr/bin/env bash
# Motion-detection preprocessing for the 2026-09 cinema source video.
#
# Converts a video so that a pixel changed at any point in the last
# `window` frames maps to white, and a pixel unchanged over that whole
# window maps to black (frame differencing, per
# motion-detection-video-techniques.md). Pure ffmpeg — no Python/OpenCV
# dependency needed.
#
# Usage: ./preprocess-motion.sh <input.mp4> <output.mp4> [threshold] [blur_sigma] [window]
#   threshold  - diff cutoff, 0-255 (default 48; tuned against the forsythe
#                placeholder video — lower picks up more background noise,
#                higher starts eating faint/slow motion)
#   blur_sigma - pre-diff Gaussian blur to denoise before differencing
#                (default 1.5)
#   window     - how many recent frames a change stays "on" for, i.e. a
#                pixel is white if it changed vs. the previous frame at any
#                point in the last `window` frames (default 5; 1 = only the
#                immediately preceding frame, no persistence/trailing)

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <input.mp4> <output.mp4> [threshold] [blur_sigma] [window]" >&2
  exit 1
fi

INPUT="$1"
OUTPUT="$2"
THRESHOLD="${3:-48}"
BLUR_SIGMA="${4:-1.5}"
WINDOW="${5:-5}"

# Per-frame change events: diff against the previous frame, thresholded to
# a binary 0/255 mask.
FILTER="format=gray,gblur=sigma=${BLUR_SIGMA},tblend=all_mode=difference,lutyuv=y=if(gt(val\,${THRESHOLD})\,255\,0)"

# Persistence: tmix averages the last `window` binary masks, so any 255 in
# that window pulls the average above 0 — re-threshold at >0 to fold that
# back down to a binary "changed within the window" mask (an OR over the
# window, computed via mix-then-threshold since ffmpeg has no native
# sliding-window max filter).
if [ "$WINDOW" -gt 1 ]; then
  FILTER="${FILTER},tmix=frames=${WINDOW},lutyuv=y=if(gt(val\,0)\,255\,0)"
fi

ffmpeg -y -i "$INPUT" \
  -vf "$FILTER" \
  -an -c:v libx264 -pix_fmt yuv420p \
  "$OUTPUT"
