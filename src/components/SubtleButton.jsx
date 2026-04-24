export default function SubtleButton({ onClick, children, contrastColors }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 px-5 text-[11px] tracking-wider uppercase transition-colors hover:bg-white/10 flex items-center justify-between border-none"
      style={{
        color: contrastColors?.textColor,
      }}
    >
      {children}
    </button>
  );
}
