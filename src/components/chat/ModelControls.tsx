'use client';

import { useState, useRef, useEffect } from 'react';

export interface ModelSettings {
  model: string;
  effort: string;        // '' | 'low' | 'medium' | 'high'
  thinkingBudget: number; // 0 = off
}

interface ModelDef {
  id: string;
  label: string;
  desc: string;
  group?: string;
}

const MODELS: ModelDef[] = [
  { id: 'opus', label: 'Opus', desc: 'Most capable', group: 'Anthropic' },
  { id: 'sonnet', label: 'Sonnet', desc: 'Fast + smart', group: 'Anthropic' },
  { id: 'haiku', label: 'Haiku', desc: 'Fastest', group: 'Anthropic' },
  { id: 'zai/glm-5', label: 'GLM-5', desc: '200K context', group: 'Z.ai' },
  { id: 'zai/glm-5-turbo', label: 'GLM-5 Turbo', desc: 'Fast + cheap', group: 'Z.ai' },
  { id: 'zai/glm-4.7', label: 'GLM-4.7', desc: '128K, reasoning', group: 'Z.ai' },
  { id: 'zai/glm-4.7-flash', label: 'GLM-4.7 Flash', desc: 'Budget', group: 'Z.ai' },
];

const ULTRATHINK_BUDGET = 50000;

// Unified thinking levels — same labels for both Opus (effort) and Sonnet (budget)
const THINKING_LEVELS = [
  { id: 'low', label: 'Low', desc: 'Quick reasoning', budget: 5000 },
  { id: 'medium', label: 'Medium', desc: 'Balanced depth', budget: 10000 },
  { id: 'high', label: 'High', desc: 'Deep analysis', budget: 20000 },
];

interface Props {
  settings: ModelSettings;
  onChange: (s: ModelSettings) => void;
}

/** Model selector dropdown */
export default function ModelControls({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const currentModel = MODELS.find((m) => m.id === settings.model) ?? MODELS[0] as ModelDef;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/[0.06] transition-colors text-xs text-stone-500 hover:text-stone-300"
      >
        <span className="font-medium">{currentModel.label}</span>
        <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-50"><path d="M2 3l2 2 2-2" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-background border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in z-50 max-h-80 overflow-y-auto">
          {(() => {
            let lastGroup = '';
            return MODELS.map((m) => {
              const showHeader = m.group && m.group !== lastGroup;
              lastGroup = m.group ?? '';
              return (
                <div key={m.id}>
                  {showHeader && (
                    <div className="px-3 py-1 text-[10px] text-stone-500 uppercase tracking-widest border-b border-border bg-white/[0.02]">
                      {m.group}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      onChange({ model: m.id, effort: '', thinkingBudget: 0 });
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                      settings.model === m.id ? 'bg-amber-500/10 text-foreground' : 'text-foreground/70 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="font-medium">{m.label}</span>
                    <span className="text-[10px] text-stone-500">{m.desc}</span>
                  </button>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

/** Thinking toggle — compact button next to send arrow */
export function ThinkingToggle({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const isOpus = settings.model === 'opus';
  const isSonnet = settings.model === 'sonnet';
  const isHaiku = settings.model === 'haiku';
  const isZai = settings.model.startsWith('zai/');
  const isUltrathink = settings.thinkingBudget >= ULTRATHINK_BUDGET;
  const hasThinking = settings.effort !== '' || settings.thinkingBudget > 0;

  // For Opus: map levels to effort param
  // For Sonnet: map levels to budget param
  const setLevel = (level: typeof THINKING_LEVELS[number] | null) => {
    if (!level) {
      onChange({ ...settings, effort: '', thinkingBudget: 0 });
    } else if (isOpus) {
      onChange({ ...settings, effort: level.id, thinkingBudget: 0 });
    } else {
      onChange({ ...settings, effort: '', thinkingBudget: level.budget });
    }
  };

  const activeLevel = isOpus
    ? THINKING_LEVELS.find((l) => l.id === settings.effort)
    : THINKING_LEVELS.find((l) => l.budget === settings.thinkingBudget);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all text-xs ${
          isUltrathink
            ? 'ultrathink-badge'
            : hasThinking
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
              : 'text-stone-600 hover:text-stone-400 hover:bg-white/[0.06]'
        }`}
        title="Thinking mode"
      >
        {isUltrathink ? '⚡' : '🧠'}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-52 bg-background border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in z-50">
          {/* Opus + Sonnet: unified levels */}
          {(isOpus || isSonnet) && (
            <>
              <div className="px-3 py-1.5 text-[10px] text-stone-500 uppercase tracking-widest border-b border-border">
                {isOpus ? 'Thinking Effort' : 'Extended Thinking'}
              </div>
              <button
                onClick={() => { setLevel(null); setOpen(false); }}
                className={`w-full flex items-center px-3 py-1.5 text-left text-xs transition-colors ${
                  !hasThinking ? 'bg-amber-500/10 text-foreground' : 'text-foreground/70 hover:bg-white/[0.04]'
                }`}
              >
                {isOpus ? 'Default' : 'Off'}
              </button>
              {THINKING_LEVELS.map((level) => (
                <button
                  key={level.id}
                  onClick={() => { setLevel(level); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                    activeLevel?.id === level.id && !isUltrathink ? 'bg-amber-500/10 text-foreground' : 'text-foreground/70 hover:bg-white/[0.04]'
                  }`}
                >
                  <span>🧠 {level.label}</span>
                  <span className="text-[10px] text-stone-500">{level.desc}</span>
                </button>
              ))}
              <button
                onClick={() => { onChange({ ...settings, effort: '', thinkingBudget: ULTRATHINK_BUDGET }); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                  isUltrathink ? 'ultrathink-bg text-white' : 'text-foreground/70 hover:bg-white/[0.04]'
                }`}
              >
                <span className={isUltrathink ? '' : 'ultrathink-text'}>⚡ Ultrathink</span>
                <span className="text-[10px] text-stone-500">50k tokens</span>
              </button>
            </>
          )}

          {/* Z.ai: no thinking controls */}
          {isZai && (
            <div className="px-3 py-2 text-[10px] text-stone-500">
              Thinking not configurable for Z.ai models
            </div>
          )}

          {/* Haiku: simple on/off */}
          {isHaiku && (
            <>
              <div className="px-3 py-1.5 text-[10px] text-stone-500 uppercase tracking-widest border-b border-border">Extended Thinking</div>
              <button
                onClick={() => { onChange({ ...settings, effort: '', thinkingBudget: 0 }); setOpen(false); }}
                className={`w-full flex items-center px-3 py-1.5 text-left text-xs transition-colors ${
                  !hasThinking ? 'bg-amber-500/10 text-foreground' : 'text-foreground/70 hover:bg-white/[0.04]'
                }`}
              >
                Off
              </button>
              <button
                onClick={() => { onChange({ ...settings, effort: '', thinkingBudget: 10000 }); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                  hasThinking ? 'bg-amber-500/10 text-foreground' : 'text-foreground/70 hover:bg-white/[0.04]'
                }`}
              >
                <span>🧠 On</span>
                <span className="text-[10px] text-stone-500">10k tokens</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
