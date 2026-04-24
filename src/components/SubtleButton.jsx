export default function SubtleButton({ onClick, children, contrastColors }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between border-none px-5 py-4 text-[11px] tracking-wider uppercase hover:bg-white/10 cursor-pointer"
      style={{
        color: contrastColors?.textColor,
        transition: 'color 300ms ease-out, background-color 300ms ease-out',
      }}
    >
      {children}
    </button>
  )
}
