import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

export default function CollapsibleSection({
  title,
  isExpanded,
  onToggle,
  children,
  className,
}) {
  const { contrastColors } = useTheme()

  return (
    <div className={cn('flex flex-col gap-7', className)}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-sm bg-white/10 px-2 py-2 text-[11px] tracking-wider uppercase transition-colors hover:bg-white/15"
        style={{
          color: contrastColors?.text,
          borderColor: contrastColors?.borderHover,
          borderWidth: '1px',
          borderStyle: 'solid',
          transition:
            'color 300ms ease-out, border-color 300ms ease-out, background-color 300ms ease-out',
        }}
      >
        <span>{title}</span>
        <span className="text-[10px]">{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && <div className="flex flex-col gap-7">{children}</div>}
    </div>
  )
}
