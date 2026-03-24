'use client';

interface Props {
  tool: 'select' | 'note' | 'heading' | 'file';
  setTool: (t: 'select' | 'note' | 'heading' | 'file') => void;
  zoom: number;
  setZoom: (z: number) => void;
}

const tools = [
  { id: 'select' as const, icon: '↖', label: 'Select' },
  { id: 'note' as const, icon: '📝', label: 'Note' },
  { id: 'heading' as const, icon: 'H', label: 'Heading' },
  { id: 'file' as const, icon: '📄', label: 'File' },
];

export default function WBToolbar({ tool, setTool, zoom, setZoom }: Props) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border border-border rounded-xl shadow-lg px-2 py-1.5 z-10">
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
            tool === t.id
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
              : 'text-stone-500 hover:bg-white/[0.06] hover:text-stone-300'
          }`}
          title={t.label}
        >
          {t.icon}
        </button>
      ))}

      <div className="w-px h-5 bg-border mx-1" />

      <button
        onClick={() => setZoom(Math.max(0.2, zoom - 0.1))}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-stone-500 hover:bg-white/[0.06] hover:text-stone-300"
        title="Zoom out"
      >
        −
      </button>
      <button
        onClick={() => setZoom(1)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] text-stone-500 hover:bg-white/[0.06] hover:text-stone-300 font-mono"
        title="Reset zoom"
      >
        1:1
      </button>
      <button
        onClick={() => setZoom(Math.min(3, zoom + 0.1))}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-stone-500 hover:bg-white/[0.06] hover:text-stone-300"
        title="Zoom in"
      >
        +
      </button>
    </div>
  );
}
