import { cn } from '../../lib/utils'
import Typography from './Typography'

export default function Checkbox({ checked, onChange, label, className }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-1.5 text-[11px] select-none',
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="relative h-4 w-4 cursor-pointer appearance-none rounded bg-white/10 checked:after:absolute checked:after:top-1/2 checked:after:left-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 checked:after:text-[12px] checked:after:font-bold checked:after:content-['✓']"
        style={{
          borderColor: 'var(--ct-border-hover)',
          borderWidth: '1px',
          borderStyle: 'solid',
          color: 'var(--ct-text)',
          transition:
            'color var(--duration-color) ease-out, border-color var(--duration-color) ease-out, background-color var(--duration-color) ease-out',
        }}
      />
      <Typography as="span">{label}</Typography>
    </label>
  )
}
