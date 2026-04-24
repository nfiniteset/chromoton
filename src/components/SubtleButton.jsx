export default function SubtleButton({ onClick, children, contrastColors }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 px-5 text-[11px] tracking-wider uppercase hover:bg-white/10 flex items-center justify-between border-none"
      style={{
        color: contrastColors?.textColor,
        transition: 'color 300ms ease-out, background-color 300ms ease-out'
      }}
    >
      {children}
    </button>
  );
}
