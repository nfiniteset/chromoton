import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface SubtleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  children: ReactNode
}

const SubtleButton = forwardRef<HTMLButtonElement, SubtleButtonProps>(
  function SubtleButton(
    { onClick, children, className, active = false, style, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          'subtle-button flex w-full cursor-pointer items-center justify-between px-5 py-4 text-[11px] tracking-wider uppercase',
          active && 'subtle-button--active',
          className
        )}
        style={style}
        {...props}
      >
        {children}
      </button>
    )
  }
)

export default SubtleButton
