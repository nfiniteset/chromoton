import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

export default function Divider({ className }) {
  const { contrastColors } = useTheme()

  return (
    <hr
      className={cn('h-px border-none', className)}
      style={{
        backgroundColor: contrastColors.borderColor,
        transition: 'background-color 300ms ease-out',
      }}
    />
  )
}
