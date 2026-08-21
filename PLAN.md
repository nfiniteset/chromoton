# Chromoton — Working Plan

This file tracks active and upcoming work on this project. Update it as tasks are added, started, finished, or dropped — it should always reflect current reality, not a historical log.

## In Progress

_(none yet)_

## Up Next

- **Panel-suppression / performance mode** — a shortcut or mode that fully hides all panels/chrome (beyond the existing panel-hidden state) for screen capture and live performance use; longer-term, control the sim from a second device during a performance (staged, not all at once).
- **Dynamic contrast in cinema** — auto-adjust contrast (or dim the white target) so the white target color's on-screen share stays within a target range (e.g. 15–25%), instead of blowing out to full brightness. Needs experimentation to land on the right approach.

## Done

- **Keyboard shortcuts cleanup** — replaced three inconsistent `keydown` listeners with one central registry (`useKeyboardShortcut`), a single dispatcher, and a command menu (`mod+k` / `/`). Shortcuts now always fire regardless of panel visibility; panel visibility is driven by mouse (unchanged) and keyboard focus (new). Fixed a real bug found along the way: `Escape` used to be silently blocked while a palette-picker radio input had focus. Spec: [docs/keyboard-shortcuts-spec.md](docs/keyboard-shortcuts-spec.md).

## Notes / Ideas

_(none yet)_
