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
    strong: contrastColors.textColor,
    weak: contrastColors.textColorWeak,
  }

  return (
    <Component
      className={className}
      style={{
        color: colorMap[intent] || contrastColors.textColor,
        transition: 'color 300ms ease-out',
        ...style,
      }}
    >
      {children}
    </Component>
  )
}
