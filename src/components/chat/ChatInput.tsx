'use client';

import { useRef, useState, KeyboardEvent, useCallback, ClipboardEvent } from 'react';
import FilePickerDropdown from './FilePickerDropdown';
import ModelControls, { ThinkingToggle, type ModelSettings } from './ModelControls';

const MAX_SCREENSHOTS = 5;

interface ChatInputProps {
  onSend: (content: string, model?: string, thinkingBudget?: number, effort?: string) => void;
  disabled?: boolean;
  variant?: 'default' | 'glass';
  defaultModel?: string;
}

export default function ChatInput({
  onSend,
  disabled = false,
  variant = 'default',
  defaultModel = 'opus',
}: ChatInputProps) {
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    model: defaultModel,
    effort: '',
    thinkingBudget: 0,
  });
  const ref = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [fileQuery, setFileQuery] = useState('');
  const [pickerSelected, setPickerSelected] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]);

  const autoResize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, []);

  function insertFilePath(path: string) {
    if (!ref.current) return;
    const val = ref.current.value;
    const atIdx = val.lastIndexOf('@');
    if (atIdx >= 0) ref.current.value = val.slice(0, atIdx);
    setAttachedFiles((prev) => prev.includes(path) ? prev : [...prev, path]);
    setShowFilePicker(false);
    ref.current.focus();
  }

  function removeFile(path: string) {
    setAttachedFiles((prev) => prev.filter((f) => f !== path));
  }

  function removeScreenshot(idx: number) {
    setScreenshots((prev) => prev.filter((_, i) => i !== idx));
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        if (screenshots.length >= MAX_SCREENSHOTS) return;

        const file = item.getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setScreenshots((prev) => {
            if (prev.length >= MAX_SCREENSHOTS) return prev;
            return [...prev, dataUrl];
          });
        };
        reader.onerror = () => { /* clipboard image read failed — ignore silently */ };
        reader.readAsDataURL(file);
        return; // only handle first image
      }
    }
  }

  function submit() {
    const val = ref.current?.value.trim();
    if ((!val && attachedFiles.length === 0 && screenshots.length === 0) || disabled) return;
    const prefix = attachedFiles.length > 0
      ? attachedFiles.map((f) => `[file: ${f}]`).join(' ') + '\n\n'
      : '';
    onSend(
      prefix + (val || ''),
      modelSettings.model,
      modelSettings.thinkingBudget > 0 ? modelSettings.thinkingBudget : undefined,
      modelSettings.effort || undefined,
    );
    if (ref.current) { ref.current.value = ''; ref.current.style.height = 'auto'; }
    setAttachedFiles([]);
    setScreenshots([]);
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (showFilePicker) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPickerSelected((s) => {
          const items = pickerRef.current?.querySelectorAll('[data-idx]');
          return items ? Math.min(s + 1, items.length - 1) : s;
        });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPickerSelected((s) => Math.max(s - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const items = pickerRef.current?.querySelectorAll('[data-idx]');
        const el = items?.[pickerSelected];
        const text = el?.querySelector('.font-mono')?.textContent;
        if (text) insertFilePath(text);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowFilePicker(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  function handleInput() {
    autoResize();
    if (ref.current) {
      const val = ref.current.value;
      const atIdx = val.lastIndexOf('@');
      if (atIdx >= 0 && !val.slice(atIdx + 1).includes(' ')) {
        setShowFilePicker(true);
        setFileQuery(val.slice(atIdx + 1));
        setPickerSelected(0);
      } else {
        setShowFilePicker(false);
      }
    }
  }

  const isGlass = variant === 'glass';

  return (
    <div className={`p-2 ${isGlass ? '' : 'border-t border-border'}`}>
      <div className="relative">
        <div
          className={`rounded-xl px-4 py-3 transition-all ${
            isGlass
              ? 'glass-input focus-within:glow-accent focus-within:border-amber-500/20'
              : 'bg-card border border-border'
          }`}
        >
          {/* Attached file chips + screenshot thumbnails */}
          {(attachedFiles.length > 0 || screenshots.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attachedFiles.map((f) => (
                <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[11px] font-mono border border-amber-500/20">
                  <span className="text-[10px]">📄</span>
                  {f}
                  <button onClick={() => removeFile(f)} className="ml-0.5 hover:text-red-400 text-stone-500">×</button>
                </span>
              ))}
              {screenshots.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt={`Screenshot ${i + 1}`} className="h-12 w-auto rounded-md border border-white/[0.1] object-cover" />
                  <button
                    onClick={() => removeScreenshot(i)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
              {screenshots.length > 0 && screenshots.length < MAX_SCREENSHOTS && (
                <span className="text-[10px] text-stone-600 self-center">{screenshots.length}/{MAX_SCREENSHOTS}</span>
              )}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              ref={ref}
              rows={1}
              disabled={disabled}
              placeholder={disabled ? 'Thinking...' : 'Message... (@ file, paste screenshot)'}
              onKeyDown={handleKey}
              onInput={handleInput}
              onPaste={handlePaste}
              className="flex-1 bg-transparent border-none resize-none text-sm text-foreground placeholder-stone-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[24px]"
            />
            <ThinkingToggle settings={modelSettings} onChange={setModelSettings} />
            <button
              onClick={submit}
              disabled={disabled}
              className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                isGlass
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/20'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 13V3M8 3L4 7M8 3l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          {/* Model selector */}
          <div className="flex items-center mt-1 -mb-1">
            <ModelControls settings={modelSettings} onChange={setModelSettings} />
          </div>
        </div>

        {showFilePicker && (
          <div ref={pickerRef}>
            <FilePickerDropdown
              query={fileQuery}
              onSelect={insertFilePath}
              onClose={() => setShowFilePicker(false)}
              selectedIndex={pickerSelected}
            />
          </div>
        )}
      </div>
    </div>
  );
}
