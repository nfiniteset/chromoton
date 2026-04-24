import { useTheme } from '../contexts/ThemeContext'

export default function Divider() {
  const { contrastColors } = useTheme()

  return (
    <hr
      className="h-px border-none"
      style={{
        backgroundColor: contrastColors.borderColor,
        transition: 'background-color 300ms ease-out',
      }}
    />
  )
}
