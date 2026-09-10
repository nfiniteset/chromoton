#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "numpy",
#   "pillow",
#   "websockets>=13",
# ]
# ///
"""Mock LiDAR frame server for the lidar cinema variation.

Speaks the exact wire protocol an iPhone will speak (see
docs/live-lidar-input.md), but sources its frames by replaying the hybrid
variation's finished renders instead of a sensor. That lets the entire
browser side be built and verified before any Swift exists, and leaves a
regression harness behind that needs no hardware -- the same trick that let
the hybrid variation be built against placeholder assets while its real
render was still hours away.

## Protocol

WebSocket, one binary message per frame:

    [uint32 headerLength, big-endian][header JSON, UTF-8][PNG bytes]

Big-endian because it is the network order and this is a network protocol;
both ends are explicit about it (`DataView.getUint32(0)` defaults to
big-endian on the browser side, so neither end has to pass a flag).

The header:

    {"t": 1757530000.123, "w": 256, "h": 192, "near": 0.5, "far": 5.0,
     "channels": {"depth": true, "mask": true, "confidence": true},
     "tracking": "normal"}

The PNG is a plain 8-bit RGB image, one channel per signal:

    R  depth        metres, linearly quantized across [near, far]
    G  person mask  0 or 255
    B  confidence   0 / 128 / 255 for ARKit's low / medium / high

One image rather than three messages, so the channels cannot arrive out of
step with each other. PNG rather than JPEG because JPEG rings at hard edges
and the mask channel is nothing but hard edges.

## What the mock can and cannot fake

The depth asset is *relative* inverse depth from Depth Anything V2 (bright =
near), not metres -- no monocular model can produce metres, which is the
whole reason LiDAR is interesting. So the mock remaps its luma linearly onto
the header's [near, far] window:

    metres = near + (1 - luma/255) * (far - near)   ->   R = 255 - luma

which makes R linear in the window exactly as the phone's will be. The
*numbers* are invented; the *encoding* is real, and the encoding is what the
browser side is being tested against.

The confidence channel is synthesized (see synthesize_confidence) rather
than replayed, since the offline pipeline has no equivalent. Nothing in v1
consumes it -- it is transmitted from the start because it is free.

## Usage

    ./mock-server.py                       # replay the hybrid renders at 12fps
    ./mock-server.py --measure 100         # re-verify the bytes/frame table
    ./mock-server.py --no-mask             # exercise the channels-degrade path
    ./mock-server.py --drop-every 20       # exercise reconnect + hold-last-frame
    ./mock-server.py --tracking-cycle 8    # exercise the tracking readout

Then point the lidar variation's Connection URL at ws://localhost:8080/frames.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import struct
import subprocess
import sys
import time
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image
from websockets.asyncio.server import serve

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DEPTH = REPO_ROOT / "public/cinema/hybrid/media/forsythe_depth.mp4"
DEFAULT_PEOPLE = REPO_ROOT / "public/cinema/hybrid/media/forsythe_people.mp4"

# ARKit's LiDAR depth map is natively 256x192. The 16:9 assets are fitted
# into it letterboxed rather than squashed -- the engine letterboxes the
# image onto its grid anyway (sampleImageIndices), so padding here matches
# what a real 4:3 depth map will do rather than inventing a distortion the
# phone won't have.
DEFAULT_WIDTH = 256
DEFAULT_HEIGHT = 192

# The two pipes are read one frame each per tick, so they have to emit at
# the same rate. The finished hybrid renders both do (25fps, matching frame
# counts), but a stand-in might not -- the segments asset that stood in for
# the person mask is 8.33fps against depth's 25 -- so both streams are
# resampled to this before they are read, and lockstep holds either way.
SOURCE_FPS = 25

# ARKit's own defaults for a room-scale scene. Both are settable so the
# browser side's metre-labelled sliders can be checked against a window
# other than the one they were written for.
DEFAULT_NEAR_M = 0.5
DEFAULT_FAR_M = 5.0

# 10-15fps, not 60: the sim throttles to 10Hz and full rate is most of a
# phone's thermal budget. 12 sits mid-range, deliberately not a multiple of
# the sim's 100ms tick, so the browser's drop-don't-queue path is exercised
# rather than accidentally lining up.
DEFAULT_FPS = 12

CONFIDENCE_HIGH = 255
CONFIDENCE_MEDIUM = 128
CONFIDENCE_LOW = 0

# Depth-channel step (0-255) across a 3x3 neighbourhood above which the
# sensor is treated as unsure. Real LiDAR loses confidence at silhouette
# edges, where a single return straddles two surfaces.
EDGE_MEDIUM = 12
EDGE_LOW = 40

# Fraction of the depth window beyond which range alone costs confidence.
# The ~5m ceiling is a soft one on real hardware: returns thin out well
# before they stop.
FAR_MEDIUM = 0.70
FAR_LOW = 0.90

# The mask asset is a hard black/white render, but h264 leaves ringing on
# its edges -- the same 128 cutoff the engine's overlay uses.
MASK_THRESHOLD = 128

# ARKit's ARCamera.TrackingState, spelled as the phone app will send it.
TRACKING_STATES = ("normal", "limited", "notAvailable")


def ffprobe(path: Path) -> str:
    """One-line description of a source file, or a raised error if unreadable."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,r_frame_rate,nb_frames",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed on {path}: {result.stderr.strip()}")
    fields = result.stdout.split()
    return " ".join(fields)


def open_gray_stream(path: Path, width: int, height: int) -> subprocess.Popen:
    """An endlessly looping ffmpeg pipe of raw 8-bit grayscale frames.

    `-stream_loop -1` does the looping, so there is no restart-at-EOF path
    here to get wrong. stderr goes to /dev/null because a piped stderr
    nobody drains will eventually fill and deadlock the decoder; the
    ffprobe above is what turns an unreadable file into a legible error.
    """
    vf = (
        f"fps={SOURCE_FPS},"
        f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
        f"pad={width}:{height}:-1:-1:color=black"
    )
    return subprocess.Popen(
        [
            "ffmpeg", "-v", "error",
            "-stream_loop", "-1",
            "-i", str(path),
            "-vf", vf,
            "-pix_fmt", "gray",
            "-f", "rawvideo",
            "-",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )


def read_gray_frame(proc: subprocess.Popen, width: int, height: int):
    """One frame off a raw pipe, or None once the decoder has stopped."""
    want = width * height
    buf = proc.stdout.read(want)
    if buf is None or len(buf) < want:
        return None
    return np.frombuffer(buf, dtype=np.uint8).reshape(height, width)


def dilate3(a: np.ndarray) -> np.ndarray:
    """3x3 maximum filter, numpy-only (scipy would be a dependency for this).

    np.roll wraps, so the outermost row/column borrows from the opposite
    edge. On a letterboxed frame those are padding, so it costs nothing
    worth a separate code path.
    """
    out = a
    for axis in (0, 1):
        out = np.maximum(
            out, np.maximum(np.roll(out, 1, axis), np.roll(out, -1, axis))
        )
    return out


def synthesize_confidence(depth: np.ndarray) -> np.ndarray:
    """A plausible ARKit confidence map for an already-packed depth channel.

    `depth` is the R channel: 0 = nearest, 255 = farthest. Confidence starts
    high and is knocked down by the two things that actually cost a LiDAR
    sensor certainty -- depth discontinuities, and range. Dark and shiny
    surfaces cost it too, but nothing in a depth map says where those are,
    so the mock does not pretend to know.
    """
    d = depth.astype(np.int16)
    gx = np.abs(d - np.roll(d, 1, axis=1))
    gx[:, 0] = 0
    gy = np.abs(d - np.roll(d, 1, axis=0))
    gy[0, :] = 0
    edge = dilate3(np.maximum(gx, gy))

    conf = np.full(d.shape, CONFIDENCE_HIGH, dtype=np.uint8)
    conf = np.where(edge >= EDGE_MEDIUM, CONFIDENCE_MEDIUM, conf)
    conf = np.where(edge >= EDGE_LOW, CONFIDENCE_LOW, conf)
    conf = np.where(d >= FAR_MEDIUM * 255, np.minimum(conf, CONFIDENCE_MEDIUM), conf)
    conf = np.where(d >= FAR_LOW * 255, CONFIDENCE_LOW, conf)
    return conf.astype(np.uint8)


def pack_frame(depth_luma: np.ndarray, mask_luma: np.ndarray | None) -> bytes:
    """Pack the three signals into one PNG's R/G/B and return its bytes."""
    # The assets are inverse depth (bright = near); the protocol's depth
    # channel is metres across the header window (0 = near). One inversion,
    # here rather than in the browser, so the wire format is the phone's.
    depth = (255 - depth_luma.astype(np.int16)).astype(np.uint8)

    if mask_luma is None:
        mask = np.zeros_like(depth)
    else:
        mask = np.where(mask_luma >= MASK_THRESHOLD, 255, 0).astype(np.uint8)

    confidence = synthesize_confidence(depth)

    rgb = np.dstack([depth, mask, confidence])
    buf = BytesIO()
    Image.fromarray(rgb, mode="RGB").save(buf, format="PNG")
    return buf.getvalue()


def build_message(png: bytes, header: dict) -> bytes:
    raw = json.dumps(header, separators=(",", ":")).encode("utf-8")
    return struct.pack(">I", len(raw)) + raw + png


class FrameSource:
    """The two ffmpeg pipes, read in lockstep and packed into one image.

    The two assets are rendered from the same source at the same resolution
    and frame rate with matching frame counts (see PLAN.md), so reading one
    frame from each per tick keeps them in register by construction -- which
    is the whole point of packing them into one message.
    """

    def __init__(self, depth_path: Path, people_path: Path | None,
                 width: int, height: int):
        self.width = width
        self.height = height
        self.depth_proc = open_gray_stream(depth_path, width, height)
        self.people_proc = (
            open_gray_stream(people_path, width, height) if people_path else None
        )

    def next_png(self) -> bytes | None:
        depth = read_gray_frame(self.depth_proc, self.width, self.height)
        if depth is None:
            return None
        mask = None
        if self.people_proc is not None:
            mask = read_gray_frame(self.people_proc, self.width, self.height)
            if mask is None:
                return None
        return pack_frame(depth, mask)

    def close(self) -> None:
        for proc in (self.depth_proc, self.people_proc):
            if proc is None:
                continue
            proc.terminate()
            try:
                proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                proc.kill()


class Broadcast:
    """The latest packed frame, plus the machinery to fan it out.

    One producer packs and PNG-encodes each frame exactly once no matter how
    many browsers are attached, and each client sends whatever the latest
    frame is when it next comes free. A slow client therefore skips frames
    rather than building a backlog -- the same drop-don't-queue rule the
    browser side follows, for the same reason.
    """

    def __init__(self):
        self.cond = asyncio.Condition()
        self.latest: bytes | None = None
        self.seq = 0
        self.accepting = True
        self.clients: set = set()

    async def publish(self, message: bytes) -> None:
        async with self.cond:
            self.latest = message
            self.seq += 1
            self.cond.notify_all()

    async def wait_for(self, last_seq: int) -> tuple[bytes, int]:
        async with self.cond:
            await self.cond.wait_for(lambda: self.seq != last_seq)
            return self.latest, self.seq


async def producer(source: FrameSource, cast: Broadcast, args) -> None:
    """Pack and publish frames on a fixed wall-clock cadence.

    The cadence is held against a running deadline rather than a
    sleep-per-frame, so a slow PNG encode borrows from the next frame's
    budget instead of letting the stream drift permanently late.
    """
    period = 1.0 / args.fps
    deadline = time.monotonic()
    started = time.monotonic()

    while True:
        png = await asyncio.to_thread(source.next_png)
        if png is None:
            print("Frame source ended unexpectedly -- stopping.", file=sys.stderr)
            return

        elapsed = time.monotonic() - started
        if args.tracking_cycle:
            tracking = TRACKING_STATES[
                int(elapsed // args.tracking_cycle) % len(TRACKING_STATES)
            ]
        else:
            tracking = args.tracking

        header = {
            "t": round(time.time(), 3),
            "w": args.width,
            "h": args.height,
            "near": args.near,
            "far": args.far,
            "channels": {
                "depth": True,
                "mask": not args.no_mask,
                "confidence": True,
            },
            "tracking": tracking,
        }
        await cast.publish(build_message(png, header))

        deadline += period
        delay = deadline - time.monotonic()
        if delay < 0:
            deadline = time.monotonic()
            delay = 0
        await asyncio.sleep(delay)


async def dropper(cast: Broadcast, every: float, duration: float) -> None:
    """Periodically hang up on everyone, to exercise reconnect + backoff.

    A live show's failure happens during setup, so the browser's
    auto-reconnect and hold-the-last-frame behavior needs to be testable
    without unplugging anything.
    """
    while True:
        await asyncio.sleep(every)
        print(f"-- simulated dropout for {duration}s", flush=True)
        cast.accepting = False
        for ws in list(cast.clients):
            await ws.close(code=1012, reason="mock dropout")
        await asyncio.sleep(duration)
        cast.accepting = True
        print("-- accepting connections again", flush=True)


def make_handler(cast: Broadcast):
    async def handler(websocket):
        peer = getattr(websocket, "remote_address", None)
        if not cast.accepting:
            await websocket.close(code=1013, reason="mock dropout")
            return

        cast.clients.add(websocket)
        print(f"+ client connected: {peer}", flush=True)
        last_seq = -1
        try:
            while True:
                message, last_seq = await cast.wait_for(last_seq)
                await websocket.send(message)
        except Exception:
            pass
        finally:
            cast.clients.discard(websocket)
            print(f"- client disconnected: {peer}", flush=True)

    return handler


def measure(source: FrameSource, args) -> int:
    """Pack N frames and report the payload sizes, without serving anything.

    This is what the bytes/frame table in docs/live-lidar-input.md is
    claiming, so it is worth being able to re-run it against whatever the
    current assets and resolution actually are.
    """
    sizes = []
    start = time.monotonic()
    for _ in range(args.measure):
        png = source.next_png()
        if png is None:
            break
        sizes.append(len(png))
    seconds = time.monotonic() - start

    if not sizes:
        print("No frames packed.", file=sys.stderr)
        return 1

    arr = np.array(sizes)
    raw = args.width * args.height * 3
    mbps = arr.mean() * 8 * args.fps / 1e6
    print(f"frames        {len(sizes)} at {args.width}x{args.height}")
    print(f"pack rate     {len(sizes) / seconds:.1f} fps (encode only)")
    print(f"raw 3-channel {raw:,} bytes/frame")
    print(f"png mean      {arr.mean():,.0f} bytes/frame  ({raw / arr.mean():.1f}x smaller)")
    print(f"png median    {np.median(arr):,.0f} bytes/frame")
    print(f"png max       {arr.max():,} bytes/frame")
    print(f"at {args.fps} fps    {mbps:.2f} Mbps mean")
    return 0


async def serve_forever(source: FrameSource, cast: Broadcast, args) -> None:
    async with serve(make_handler(cast), args.host, args.port):
        print(f"Serving ws://{args.host}:{args.port}/frames at {args.fps} fps")
        print("(the path is ignored; any path connects)")
        print("Browser side: use ws://127.0.0.1:<port>/frames -- an IPv4-only\n      bind, and `localhost` may resolve to ::1 first.", flush=True)
        tasks = [asyncio.create_task(producer(source, cast, args))]
        if args.drop_every:
            tasks.append(
                asyncio.create_task(dropper(cast, args.drop_every, args.drop_for))
            )
        try:
            await asyncio.gather(*tasks)
        finally:
            for task in tasks:
                task.cancel()


def parse_args(argv=None):
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--depth", type=Path, default=DEFAULT_DEPTH,
                   help="depth video to replay (default: the hybrid render)")
    p.add_argument("--people", type=Path, default=DEFAULT_PEOPLE,
                   help="person-mask video to replay (default: the hybrid render)")
    p.add_argument("--width", type=int, default=DEFAULT_WIDTH)
    p.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    p.add_argument("--fps", type=float, default=DEFAULT_FPS,
                   help=f"send rate (default: {DEFAULT_FPS})")
    p.add_argument("--near", type=float, default=DEFAULT_NEAR_M,
                   help="near end of the depth window, in metres")
    p.add_argument("--far", type=float, default=DEFAULT_FAR_M,
                   help="far end of the depth window, in metres")
    p.add_argument("--host", default="0.0.0.0",
                   help="0.0.0.0 so a phone-less wireless test can reach it")
    p.add_argument("--port", type=int, default=8080)
    p.add_argument("--no-mask", action="store_true",
                   help="send channels.mask=false and an empty G channel, to "
                        "exercise the bands-only degrade path")
    p.add_argument("--tracking", default="normal", choices=TRACKING_STATES,
                   help="fixed ARKit tracking state to report")
    p.add_argument("--tracking-cycle", type=float, default=0,
                   help="instead, rotate through the tracking states every N seconds")
    p.add_argument("--drop-every", type=float, default=0,
                   help="hang up on every client every N seconds")
    p.add_argument("--drop-for", type=float, default=3,
                   help="how long each simulated dropout lasts (default: 3s)")
    p.add_argument("--measure", type=int, default=0,
                   help="pack N frames, report payload sizes, and exit")
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)

    if args.near >= args.far:
        print("--near must be less than --far", file=sys.stderr)
        return 1

    people_path = None if args.no_mask else args.people
    for path in (args.depth, people_path):
        if path is None:
            continue
        if not path.exists():
            print(f"Not found: {path}", file=sys.stderr)
            print("Render the hybrid assets first, or pass --depth/--people.",
                  file=sys.stderr)
            return 1
        try:
            print(f"source  {path.name}  ({ffprobe(path)})")
        except RuntimeError as err:
            # A render still in flight is the common case here: the file
            # exists and grows, but has no moov atom until ffmpeg finishes.
            print(err, file=sys.stderr)
            print("If that render is still running, pass --people with a "
                  "finished stand-in (e.g. placeholder_people.mp4) or "
                  "--no-mask.", file=sys.stderr)
            return 1

    source = FrameSource(args.depth, people_path, args.width, args.height)
    try:
        if args.measure:
            return measure(source, args)
        asyncio.run(serve_forever(source, Broadcast(), args))
    except KeyboardInterrupt:
        print()
    finally:
        source.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
