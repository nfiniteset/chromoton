import { cn } from '../lib/utils'

export default function Typography({
  as = 'p',
  intent = 'strong',
  children,
  className = '',
  style = {},
}) {
  const Component = /** @type {import('react').ElementType} */ (as)

  const colorMap = {
    strong: 'var(--ct-text)',
    weak: 'var(--ct-text-weak)',
  }

  return (
    <Component
      className={cn(className)}
      style={{
        color: colorMap[intent] || 'var(--ct-text)',
        transition: 'color 300ms ease-out',
        ...style,
      }}
    >
      {children}
    </Component>
  )
}
