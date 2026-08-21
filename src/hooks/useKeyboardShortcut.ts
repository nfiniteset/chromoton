import { useEffect, useRef, useSyncExternalStore } from 'react'

export interface KeyboardShortcutSpec {
  /** Unique across the whole app — used for dedup, warnings, and command-menu identity. */
  id: string
  /**
   * One or more combos this shortcut fires on, e.g. ['`'], ['mod+k', '/'],
   * ['ArrowLeft', 'ArrowRight']. `mod` resolves to Cmd on Mac, Ctrl elsewhere.
   * Letter keys match case-insensitively; unlisted modifiers (ctrl/meta/alt)
   * must be absent for a bare key to match. Shift is only enforced when a
   * combo explicitly includes `shift+`.
   */
  keys: string[]
  /** Shown in the command menu. */
  label: string
  handler: (e: KeyboardEvent) => void
  /** Registered only while true. Defaults to true. */
  enabled?: boolean
}

interface Entry {
  id: string
  keys: string[]
  label: string
  handler: (e: KeyboardEvent) => void
}

const registry = new Map<string, Entry>()
const listeners = new Set<() => void>()
let snapshot: Entry[] | null = null

function notify() {
  snapshot = null
  listeners.forEach((listener) => listener())
}

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent)
}

function parseCombo(combo: string): { base: string; mods: Set<string> } {
  const parts = combo.split('+')
  const base = (parts.pop() ?? '').toLowerCase()
  return { base, mods: new Set(parts.map((p) => p.toLowerCase())) }
}

function canonicalCombo(combo: string): string {
  const { base, mods } = parseCombo(combo)
  const resolved = new Set(mods)
  if (resolved.has('mod')) {
    resolved.delete('mod')
    resolved.add(isMac() ? 'meta' : 'ctrl')
  }
  return [...resolved].sort().join('+') + '+' + base
}

function comboMatchesEvent(combo: string, e: KeyboardEvent): boolean {
  const { base, mods } = parseCombo(combo)
  if (e.key.toLowerCase() !== base) return false

  const wantMod = mods.has('mod')
  const wantCtrl = mods.has('ctrl') || (wantMod && !isMac())
  const wantMeta = mods.has('meta') || (wantMod && isMac())
  const wantAlt = mods.has('alt')
  const wantShift = mods.has('shift')

  if (e.ctrlKey !== wantCtrl) return false
  if (e.metaKey !== wantMeta) return false
  if (e.altKey !== wantAlt) return false
  if (wantShift && !e.shiftKey) return false

  return true
}

function warnOnCollision(entry: Entry) {
  const canonicalKeys = entry.keys.map(canonicalCombo)
  for (const existing of registry.values()) {
    if (existing.id === entry.id) continue
    const clash = existing.keys
      .map(canonicalCombo)
      .find((k) => canonicalKeys.includes(k))
    if (clash) {
      console.warn(
        `[useKeyboardShortcut] "${clash}" is bound to both "${existing.id}" and "${entry.id}"`
      )
    }
  }
}

/** Dispatches a keydown to the highest-priority (most recently registered) matching entry. Returns whether anything handled it. */
export function dispatchKeyboardShortcut(e: KeyboardEvent): boolean {
  let matched: Entry | undefined
  for (const entry of registry.values()) {
    if (entry.keys.some((combo) => comboMatchesEvent(combo, e))) {
      matched = entry
    }
  }
  if (!matched) return false
  matched.handler(e)
  return true
}

export function useKeyboardShortcut(spec: KeyboardShortcutSpec) {
  const { id, label, enabled = true } = spec
  const keysKey = spec.keys.join(',')
  const specRef = useRef(spec)

  // Keep the ref current after every render (not during render — refs
  // shouldn't be written while rendering), so the registration effect below
  // can call the latest handler without re-registering on every change.
  useEffect(() => {
    specRef.current = spec
  })

  useEffect(() => {
    if (!enabled) return

    const entry: Entry = {
      id,
      keys: specRef.current.keys,
      label,
      handler: (e) => specRef.current.handler(e),
    }
    warnOnCollision(entry)
    registry.set(id, entry)
    notify()

    return () => {
      registry.delete(id)
      notify()
    }
  }, [id, keysKey, label, enabled])
}

/** Reactive list of every currently-registered shortcut, for the command menu. */
export function useKeyboardShortcutsList(): Entry[] {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => snapshot ?? (snapshot = Array.from(registry.values()))
  )
}
