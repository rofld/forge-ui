'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme, THEME_COLORS } from '@/lib/theme-context';

export default function ThemePicker() {
  const { themeColor, setThemeColor, themeMode, toggleMode, meta } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 w-full text-left hover:bg-white/[0.04] rounded-lg transition-colors"
        title="Switch theme"
      >
        <span
          className="w-3 h-3 rounded-full shrink-0 border border-white/20"
          style={{ backgroundColor: meta.swatch }}
        />
        <span className="text-[10px] text-stone-500 tracking-wide uppercase font-mono truncate">
          {meta.name}
        </span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-52 bg-popover border border-border rounded-xl shadow-2xl shadow-black/30 overflow-hidden animate-fade-in z-50">
          {/* Header: THEME label + dark/light toggle */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-[10px] text-stone-600 uppercase tracking-widest font-medium">
              Theme
            </span>
            {/* Dark/Light toggle */}
            <button
              onClick={toggleMode}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors hover:bg-white/[0.06]"
              title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
            >
              {themeMode === 'dark' ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-stone-400">
                    <path d="M8 1v1M8 14v1M1 8h1M14 8h1M3.05 3.05l.7.7M12.25 12.25l.7.7M3.05 12.95l.7-.7M12.25 3.75l.7-.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  <span className="text-stone-500">Light</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-stone-400">
                    <path d="M13.5 8.5a5.5 5.5 0 01-7-7 6 6 0 107 7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-stone-500">Dark</span>
                </>
              )}
            </button>
          </div>

          {/* Color options */}
          <div className="py-1">
            {THEME_COLORS.map((t) => (
              <button
                key={t.color}
                onClick={() => { setThemeColor(t.color); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors ${
                  themeColor === t.color
                    ? 'bg-white/[0.08] text-stone-100'
                    : 'text-stone-400 hover:bg-white/[0.04] hover:text-stone-200'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full shrink-0 border transition-all ${
                    themeColor === t.color ? 'border-white/40 scale-110' : 'border-white/15'
                  }`}
                  style={{ backgroundColor: t.swatch }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-[10px] text-stone-600 truncate">{t.description}</div>
                </div>
                {themeColor === t.color && (
                  <span className="text-[10px] text-stone-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
