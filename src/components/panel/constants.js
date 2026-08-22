// How "open" each panel state is, used to pick the transition's direction
// (and therefore its easing curve) whenever the state changes.
export const OPENNESS = { open: 2, peek: 1, hidden: 0 }

// Panel offsets, expressed as translateX from the fully-open (0) position.
// `hidden` pushes the panel fully clear of the viewport (its own width plus
// the 20px gap it normally sits at). `peek` pulls back to leave a 30px
// sliver of the panel visible at the screen edge.
export const TRANSFORM = {
  open: 'translateX(0)',
  peek: 'translateX(calc(100% - 30px))',
  hidden: 'translateX(calc(100% + 20px))',
}

export const HOT_ZONE_WIDTH = 50
export const IDLE_HIDE_DELAY = 3000

export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
