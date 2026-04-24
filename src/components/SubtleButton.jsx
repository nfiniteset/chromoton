import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'

export default function SubtleButton({
  onClick,
  children,
  className,
  active = false,
}) {
  const { contrastColors } = useTheme()
  const [isHovered, setIsHovered] = useState(false)

  const getBackgroundColor = () => {
    if (active && isHovered) return contrastColors.backgroundActiveHover
    if (active) return contrastColors.backgroundActive
    if (isHovered) return contrastColors.backgroundHover
    return 'transparent'
  }

  const getBorderColor = () => {
    if (active) return contrastColors.borderColorHover
    return contrastColors.borderColor
  }

  const getTextColor = () => {
    if (active) return contrastColors.textActive
    return contrastColors.textColor
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex w-full cursor-pointer items-center justify-between px-5 py-4 text-[11px] tracking-wider uppercase ${className}`}
      style={{
        backgroundColor: getBackgroundColor(),
        borderColor: getBorderColor(),
        color: getTextColor(),
        transition:
          'color 300ms ease-out, background-color 300ms ease-out, border-color 300ms ease-out',
      }}
    >
      {children}
    </button>
  )
}
