import { cn } from '../../lib/utils'
import { TRANSFORM } from './constants'

/**
 * Visual chrome shared by every floating side panel: the fixed hit-area
 * wrapper plus the glassmorphic panel surface itself, animated between the
 * open/peek/hidden states from usePanelVisibility. Purely presentational —
 * pass panelRef through to whatever the visibility hook was given.
 */
export default function PanelShell({
  panelRef,
  panelState,
  isClosing,
  className = '',
  children,
}) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed top-0 right-0 z-[100] h-screen w-[400px]',
        className
      )}
    >
      <div
        ref={panelRef}
        className="pointer-events-auto absolute top-5 right-5 box-border flex max-h-[calc(100vh-40px)] w-[220px] flex-col gap-4 overflow-x-hidden overflow-y-auto rounded-2xl bg-white/8 text-xs tracking-wider uppercase shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl backdrop-saturate-[180%] before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/30 before:via-white/5 before:to-white/10 before:[mask-composite:exclude] before:p-px before:content-[''] before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]"
        style={{
          transform: TRANSFORM[panelState],
          transition: `transform 200ms ${isClosing ? 'var(--ease-end-off-screen)' : 'var(--ease-begin-off-screen)'}, color var(--duration-color) ease-out, border-color var(--duration-color) ease-out`,
        }}
      >
        <div className="relative z-[1] overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
