# Cinema variations

Each cinema build is a one-off for a monthly event and needs to stay usable
long after that month's event has passed, without later work risking it. So
each variation gets its own folder here (`src/cinema/<name>/`, e.g.
`2026-08-forsythe/`) plus a matching `cinema/<name>/index.html` at the repo
root and `public/cinema/<name>/media/` for its video. Vite picks up any
`cinema/<name>/index.html` automatically ([vite.config.js](../../vite.config.js)) —
no build config changes needed for a new variation.

Most variations are named for the month they're built for, but nothing
requires it — a variation exploring a technique rather than serving a
specific event can take a descriptive name instead (`depth-map/`). Same
structure either way; only the "starting a new month" checklist below is
month-specific.

## What's shared vs. forked

Shared (lives once, outside this folder, changes should be additive so old
variations keep working unmodified):

- [chromoton.js](../../chromoton.js) — the simulation engine. Add new
  capabilities as new methods/config keys with defaults that preserve
  existing behavior when unset (e.g. `setAutoThreshold`/`setAutoDim`). Don't
  repurpose or change the meaning of an existing one.
- [Chromoton.jsx](../Chromoton.jsx) — the React wrapper around it.
- [strategies/](../strategies) — plugin registry. A new strategy is a new
  file plus one registry line; existing strategies are untouched.
- [components/primitives](../components/primitives),
  [components/panel](../components/panel),
  [components/Scrubber.jsx](../components/Scrubber.jsx) — shared UI kit.
- [components/VariantNav.jsx](../components/VariantNav.jsx) — top-left title
  button + menu for jumping between variations, reading from
  [variants.js](variants.js). Each variation renders it with its own id
  (`<VariantNav current="<name>" .../>`); the menu contents themselves are
  shared, driven entirely by `variants.js`.

Forked (copy the previous month's folder and diverge freely): `CinemaApp.jsx`
(video source, tuning defaults, which strategies are wired up),
`CinemaControlPanel.jsx` (panel layout/controls — expected to differ month to
month, so it's a full copy rather than one component threaded with
ever-more config), `main.jsx`, `useVideoImageMode.ts` if a variation needs
its own image-sampling behavior.

## Starting a new month

1. Once the current month's variation has shipped for its event, freeze it:
   `git tag cinema/<name>` at the commit that was actually used, so it's
   recoverable regardless of what the shared core does later.
2. Copy the folder: `src/cinema/<name>/`, `cinema/<name>/index.html`
   (update the `<script src>` path inside it), `public/cinema/<name>/media/`.
3. Update imports in the copied files if `<name>` changes depth (it won't,
   siblings under `src/cinema/` are all one level deep).
4. Swap in the new video (`VIDEO_SRC` in `CinemaApp.jsx`), retune the
   `DEFAULT_*` constants, adjust the panel as needed.
5. Point `/cinema` at it: update the redirect target (meta refresh + script)
   in `cinema/index.html` to `./<name>/`. That's the stable URL — it always
   points at whichever month is current, so it doesn't need to be shared
   again each month.
6. Register it in [variants.js](variants.js) (adds it to every variation's
   nav menu, including past ones) and add `<VariantNav current="<name>" .../>`
   to the copied `CinemaApp.jsx` if it isn't already there.
