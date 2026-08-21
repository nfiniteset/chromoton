# Keyboard shortcuts & command menu — spec

Status: implemented. Tracked in [PLAN.md](../PLAN.md).

## Problems with the current system

Shortcuts are handled by three independent `keydown` listeners with three different rule sets:

- [`KeyboardControls.jsx`](../src/components/KeyboardControls.jsx) — `Escape`, `p`, `s`. Swallows the first keypress while the panel is hidden to just reveal the panel, instead of performing the action.
- [`Chromoton.jsx`](../src/Chromoton.jsx) — `` ` ``, `m`, `f`. No panel-hidden guard at all — these always fire.
- [`CinemaApp.jsx`](../src/cinema/CinemaApp.jsx) — `Space`, `ArrowLeft`/`ArrowRight`. Own copy of the input-focus guard.

Result: inconsistent behavior depending on which key you press and whether the panel happens to be hidden, three copies of the same input-focus guard logic to keep in sync, and no single place that knows "everything this app can do" — which is also why there's no command menu today.

## Core decisions

1. **Actions always fire**, regardless of panel visibility. No shortcut key reveals the panel anymore — that's the current source of "shortcuts don't fire when I expect."
2. **Panel visibility is no longer shortcut-driven.** It's controlled by mouse (existing hover/idle system, unchanged) and by keyboard _focus_ (new — see "Panel focus behavior" below). This is orthogonal to the shortcut registry.
3. **One central registry**, fed by a hook any component can call. `KeyboardControls` becomes the single `document.addEventListener('keydown', …)` owner and dispatcher; it no longer owns any app-specific behavior itself.
4. **Existing shortcut keys are unchanged** in this pass — this is a reliability/architecture refactor, not a rebind. Rebinding is a future, separate pass.
5. **Command menu** is a consumer of the same registry — same list, two ways to invoke.

## Registry API

New hook, `src/hooks/useKeyboardShortcut.ts`:

```ts
useKeyboardShortcut({
  id: string,        // unique, e.g. 'toggle-monochrome'
  keys: string[],    // e.g. ['`'], ['m'], ['mod+k', '/'], ['shift+ArrowRight']
  label: string,     // shown in the command menu, e.g. "Toggle monochrome"
  handler: (e: KeyboardEvent) => void,
})
```

- Backed by a module-level store (not React context) so any component, anywhere in either app's tree, can register without prop drilling.
- A component registers/unregisters via `useEffect` as usual — e.g. `ControlPanel` only has an `Escape` registration active while `showPalettePicker` is true, achieved by including it in the effect's dependencies, not by any special-casing in the dispatcher.
- `useKeyboardShortcutsList()` (`useSyncExternalStore`) gives the command menu a live, reactive list of everything currently registered.
- `mod` normalizes to Cmd on Mac / Ctrl elsewhere. Letter keys match case-insensitively (preserves today's `m`/`M` behavior).
- Dev-only: registering a key that's already claimed logs a `console.warn` with both ids, so collisions surface immediately instead of silently shadowing.

## Dispatcher (`KeyboardControls.jsx`)

Mounted once per app root (in `App.jsx` and `CinemaApp.jsx`), sibling to `ThemeProvider`. On `keydown`:

1. Skip if `e.target` is `INPUT`, `TEXTAREA`, `SELECT`, or `isContentEditable` — centralized, single copy of this guard (replaces three copies). `BUTTON` is _not_ guarded, so native Space/Enter activation on a focused button still works untouched.
2. Look up the pressed combo in the registry. If a handler is registered, call it — the most recently registered handler wins if more than one claims the same key (shouldn't normally happen; the dev warning above is the real safety net).
3. **`Escape` has a default fallback**: if nothing is registered for `Escape` at the moment, blur `document.activeElement`. This is what replaces the old two-stage "close picker, then hide panel" — see below.

## Panel focus behavior (replaces Escape's old panel-hiding role)

Not a "shortcut" — plain DOM `focusin`/`focusout` handling, added to `ControlPanel.jsx` / `CinemaControlPanel.jsx` alongside the existing mouse-driven `open`/`peek`/`hidden` state machine (unchanged):

- **`Tab` with nothing focused document-wide** focuses the panel's first focusable control. (New: a small document-level check for this specific case, since there's otherwise nothing else on the page to receive it.)
- **Focus entering the panel** (`panelRef.current.contains(document.activeElement)`) opens the panel and suspends the idle/mouse-hide timer for as long as focus stays inside — a focused control that suddenly hides mid-Tab would be broken.
- **Focus leaving the panel entirely** hides it immediately (no waiting on the mouse-idle timer — a keyboard user isn't moving the mouse, so that would just feel stuck). Uses `relatedTarget` (or a rAF check of `document.activeElement`) to distinguish "focus moved to another control inside the panel" from "focus left the panel," so internal Tabbing doesn't flicker the panel closed/reopened.
- **`Escape` two-stage**, now composed from two independent, unrelated things instead of one hardcoded chain:
  - Press 1: `showPalettePicker` is true → `ControlPanel` has an active `Escape` registration that closes the picker and returns focus to the "Color palette" link (already-existing focus-management behavior).
  - Press 2: picker's already closed, so nothing is registered for `Escape` → dispatcher's default fallback blurs the active element → focus leaves the panel → panel hides per the rule above.
- Existing `Tab`/`Shift+Tab` focus-trap wrap-around while the panel is open and focused is unchanged.
- Mouse hover/hot-zone/idle-hide system is completely unchanged; this is purely additive for keyboard users.

## Command menu

New `src/components/CommandMenu.jsx`, mounted once per app root next to `KeyboardControls`.

- Opens on `mod+k` **or** `/` (both registered as its trigger).
- Renders every entry from `useKeyboardShortcutsList()` — label + bound key(s) — in a searchable (substring match on label) overlay, visually consistent with the existing panel (blur/glass treatment, existing `Button`/`Typography` primitives).
- Selecting an entry (click, or arrow-key + Enter) calls its `handler` and closes the menu.
- Search input is a real `<input>`, so the dispatcher's own guard already prevents letter shortcuts from double-firing while typing a search query — no special-casing needed.
- `Escape` closes the menu: while open, `CommandMenu` holds the active `Escape` registration (same "currently active registration wins" mechanism used by the palette picker — only one overlay is ever realistically open at a time).
- Pressing the trigger again while already open just refocuses the search input; it doesn't toggle closed (closing is Escape, selecting an entry, or clicking the backdrop).

## Final shortcut inventory (unchanged keys, new mechanism)

| Key(s)                         | Action                                           | Registered by                                                       | App         |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------- | ----------- |
| `` ` ``                        | Toggle monochrome                                | `Chromoton.jsx`                                                     | both        |
| `m` / `M`                      | Toggle image mode                                | `Chromoton.jsx`                                                     | both        |
| `f` / `F`                      | Toggle FPS readout                               | `Chromoton.jsx`                                                     | both        |
| `p`                            | Toggle palette picker                            | `ControlPanel.jsx` / `CinemaControlPanel.jsx`                       | both        |
| `s`                            | Toggle show population                           | `ControlPanel.jsx` / `CinemaControlPanel.jsx`                       | both        |
| `Escape`                       | Close picker, else (fallback) blur → panel hides | `ControlPanel.jsx` / `CinemaControlPanel.jsx` + dispatcher fallback | both        |
| `Space`                        | Play/pause                                       | `CinemaApp.jsx`                                                     | cinema only |
| `←` / `→` (+Shift = 30 frames) | Frame step                                       | `CinemaApp.jsx`                                                     | cinema only |
| `mod+k` / `/`                  | Open command menu                                | `CommandMenu.jsx`                                                   | both        |

## File-level change plan

- **New:** `src/hooks/useKeyboardShortcut.ts` (registry hook + store)
- **New:** `src/components/CommandMenu.jsx`
- **Rewrite:** `src/components/KeyboardControls.jsx` — becomes the dispatcher only; loses all app-specific logic and props (`showPalettePicker`, `showPopulation`, etc. — those move to where the state already lives)
- **Edit:** `Chromoton.jsx` — remove local `keydown` effect, register its 3 shortcuts via the hook
- **Edit:** `CinemaApp.jsx` — remove local `keydown` effect, register `Space`/arrows via the hook
- **Edit:** `ControlPanel.jsx`, `CinemaControlPanel.jsx` — remove `<KeyboardControls>` child + its props; register `p`/`s`/`Escape` locally; add the focus-in/out panel behavior and the nothing-focused `Tab` handler
- **Edit:** `App.jsx`, `CinemaApp.jsx` — mount `<KeyboardControls />` and `<CommandMenu />` once each, near the root

## Manual test checklist (pre-merge)

- Every shortcut fires with the panel hidden, peeking, and open
- Every shortcut is suppressed while a text input / palette-picker radio has focus
- `Tab` with nothing focused opens the panel and focuses its first control
- `Escape` closes the picker on first press, hides the panel on second
- Tabbing between controls inside the open panel never flickers it closed
- Command menu opens via both `mod+k` and `/`, search filters, Enter/click runs the action, `Escape` closes it without also hiding the panel
- Registering a duplicate key logs the dev warning
