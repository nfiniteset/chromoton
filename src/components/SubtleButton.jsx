import { useTheme } from '../contexts/ThemeContext'

export default function SubtleButton({ onClick, children, className }) {
  const { contrastColors } = useTheme()

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between px-5 py-4 text-[11px] tracking-wider uppercase hover:bg-white/10 cursor-pointer ${className}`}
      style={{
        borderColor: contrastColors.borderColor,
        color: contrastColors.textColor,
        transition: 'color 300ms ease-out, background-color 300ms ease-out',
      }}
    >
      {children}
    </button>
  )
}
