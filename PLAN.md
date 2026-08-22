# Chromoton — Working Plan

This file tracks active and upcoming work on this project. Update it as tasks are added, started, finished, or dropped — it should always reflect current reality, not a historical log.

## In Progress

- **Dynamic contrast in cinema** — three independent toggles in the cinema control panel, each stackable, so they can be A/B'd live:
  - **Auto threshold** — retunes the black/white luma cutoff each frame so ~20% of the source image classifies as white. Disables the manual Threshold slider while on and live-updates it to the resolved cutoff instead.
  - **Auto dim white** — dims the white target based on how much of the grid the mask currently assigns to white (coverage, not convergence), gradated across [0%, 40%] → [full brightness, dimmed floor]. Stable/non-oscillating since the signal isn't affected by the dimming itself.
  - **Agitate target color** — a happy accident kept on purpose: the _original_ auto-dim measured actual population convergence, which turned out to be self-destabilizing (dimming knocks matched cells back out of range, which un-dims, which lets them match again, forever) and never let white settle — it stays "cloudy"/colorful, which looked great. Reimplemented as what it actually amounted to: a periodic small random nudge to the white target's brightness, no population measurement involved.

  All three land in [chromoton.js](chromoton.js) (`setAutoThreshold`/`setAutoDim`/`setAgitateTarget`) and [CinemaControlPanel.jsx](src/cinema/CinemaControlPanel.jsx). Next: keep A/B'ing against the footage, retune the auto-dim coverage range and agitate's step/interval to taste.

- **Cinema panel cleanup + thumbnail overlay** — stripped the cinema control panel down to playback-only controls: removed the color palette picker, target-color list, and "Spiciness" (strategy) slider (main app keeps all three; `AdvancedControls` gained a `hideStrategy` prop for this). Added a "Show thumbnail" toggle (checkbox + command palette entry) that, when on and the panel is closed, shows a small standalone thumbnail panel top-right — for screen capture / performance use without the full settings panel up. Scrubber bar: 4px padding (8px on the right, doubled per request — right padding now matches the button↔track gap), play/pause button radius nests concentrically with the bar's corner (12px against the bar's 16px), track is genuinely vertically centered (fixed a line-height/baseline quirk on the wrapper div), and hovering the track now previews a frame there (dragging still commits as before). All the dynamic-contrast toggles (auto threshold/dim/agitate) plus the thumbnail toggle are also registered as command-palette-only entries (empty `keys: []`) so they're runnable from ⌘K without opening the panel. Both auto-threshold and auto-dim also got their own "target" sliders (0–100%) exposing what were hardcoded constants (`autoThresholdTargetFraction`, `autoDimCoverageMax` in chromoton.js), so the balance points are tunable live instead of fixed at 20%/40%.

  Panel reorganized into rule-separated sections: thumbnail, then Sound/Playback speed/Show thumbnail, then **B/W Threshold** (Auto, Threshold, Auto target — target only shown while Auto is on), then **Target color** (Agitate, Auto dim, Auto dim target — target only shown while Auto dim is on), then **Simulation** (Frame rate, Resolution) at the bottom. Section labels use a new `SectionHeader` primitive ([src/components/primitives/SectionHeader.jsx](src/components/primitives/SectionHeader.jsx) — semibold + wider tracking, no new type scale). "Speed" renamed to "Frame rate" universally (`AdvancedControls.jsx`), so the main app's panel picked it up too.

## Up Next

_(none)_

## Done

- **Keyboard shortcuts cleanup** — replaced three inconsistent `keydown` listeners with one central registry (`useKeyboardShortcut`), a single dispatcher, and a command menu (`mod+k` / `/`). Shortcuts now always fire regardless of panel visibility; panel visibility is driven by mouse (unchanged) and keyboard focus (new — Tab-with-nothing-focused enters the panel, focus leaving it closes it immediately). Spec: [docs/keyboard-shortcuts-spec.md](docs/keyboard-shortcuts-spec.md). Includes a follow-up polish pass: fixed a focus-stealing bug where hiding the panel blurred whatever had just received focus (e.g. the command menu's own search field); removed the command menu's dimmed backdrop; command menu row key-labels now invert color like the row label when active; command menu divider fixed to a flush solid dark line (not the panel's dynamic, contrast-adaptive border color, which washes out on bright backdrops); removed the now-redundant Monochrome checkbox from both control panels (command menu / `` ` `` shortcut cover it) — this also surfaced and fixed a real gap where cinema mode never wired monochrome toggling to the keyboard/command-menu path at all; renamed two command-menu labels ("Open palette picker", "Toggle target percentages"); gave the command menu's search field the same inset focus ring as its rows.

## Notes / Ideas

_(none yet)_
