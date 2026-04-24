export default function CollapsibleSection({ title, isExpanded, onToggle, children, contrastColors }) {
  return (
    <div className="flex flex-col gap-7">
      <button
        onClick={onToggle}
        className="w-full py-2 px-2 bg-white/10 rounded-sm text-[11px] tracking-wider uppercase transition-colors hover:bg-white/15 flex items-center justify-between"
        style={{
          color: contrastColors?.textColor,
          borderColor: contrastColors?.borderColorHover,
          borderWidth: '1px',
          borderStyle: 'solid'
        }}
      >
        <span>{title}</span>
        <span className="text-[10px]">{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && (
        <div className="flex flex-col gap-7">
          {children}
        </div>
      )}
    </div>
  );
}
