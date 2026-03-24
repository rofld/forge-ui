'use client';

import { useRef, useEffect, useCallback, useState, KeyboardEvent, ClipboardEvent } from 'react';
import FilePickerDropdown from './FilePickerDropdown';
import ModelControls, { ThinkingToggle, type ModelSettings } from './ModelControls';

const MAX_SCREENSHOTS = 5;

interface ComposerProps {
  onSend: (content: string, model?: string, thinkingBudget?: number, effort?: string) => void;
  disabled: boolean;
  onClose: () => void;
  defaultModel?: string;
}

export default function Composer({ onSend, disabled, onClose, defaultModel = 'opus' }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    model: defaultModel,
    effort: '',
    thinkingBudget: 0,
  });
  const [fileQuery, setFileQuery] = useState('');
  const [pickerSelected, setPickerSelected] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, []);

  function insertFilePath(path: string) {
    if (!textareaRef.current) return;
    const val = textareaRef.current.value;
    const atIdx = val.lastIndexOf('@');
    if (atIdx >= 0) textareaRef.current.value = val.slice(0, atIdx);
    setAttachedFiles((prev) => prev.includes(path) ? prev : [...prev, path]);
    setShowFilePicker(false);
    textareaRef.current.focus();
    autoResize();
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
        reader.onerror = () => { /* clipboard image read failed */ };
        reader.readAsDataURL(file);
        return;
      }
    }
  }

  function submit() {
    const val = textareaRef.current?.value.trim();
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
    onClose();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
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
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); return; }
  }

  function handleInput() {
    autoResize();
    if (textareaRef.current) {
      const val = textareaRef.current.value;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[540px] mx-4 bg-background border border-border rounded-xl shadow-2xl shadow-black/50 animate-fade-in-up">
        <div className="px-4 pt-4 pb-2 relative">
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
          <textarea
            ref={textareaRef}
            rows={1}
            disabled={disabled}
            placeholder="Ask anything... (@ file, paste screenshot, Esc close)"
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            className="w-full bg-transparent text-foreground text-sm placeholder-stone-500 resize-none focus:outline-none min-h-[24px] max-h-[200px]"
          />
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
        <div className="flex items-center justify-between px-4 pb-3 text-[11px] text-stone-500">
          <ModelControls settings={modelSettings} onChange={setModelSettings} />
          <div className="flex items-center gap-1">
            <ThinkingToggle settings={modelSettings} onChange={setModelSettings} />
            <button
              onClick={submit}
              disabled={disabled}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/20 transition-colors disabled:opacity-30"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 13V3M8 3L4 7M8 3l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
