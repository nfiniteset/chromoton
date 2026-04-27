import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

export default function Typography({
  as = 'p',
  intent = 'strong',
  children,
  className = '',
  style = {},
}) {
  const { contrastColors } = useTheme()
  const Component = as

  const colorMap = {
    strong: contrastColors.text,
    weak: contrastColors.textWeak,
  }

  return (
    <Component
      className={cn(className)}
      style={{
        color: colorMap[intent] || contrastColors.text,
        transition: 'color 300ms ease-out',
        ...style,
      }}
    >
      {children}
    </Component>
  )
}
