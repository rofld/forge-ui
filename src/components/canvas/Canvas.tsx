'use client';

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import hljs from 'highlight.js';
import { useCanvas } from '@/lib/canvas-context';
import { proseClasses } from '@/lib/prose';

function truncatePath(path: string, maxLen = 40): string {
  if (path.length <= maxLen) return path;
  const parts = path.split('/');
  let result = parts[parts.length - 1];
  for (let i = parts.length - 2; i >= 0; i--) {
    const next = parts[i] + '/' + result;
    if (next.length > maxLen) {
      return '.../' + result;
    }
    result = next;
  }
  return result;
}

/** Map our language names to highlight.js language identifiers */
function hljsLang(language: string): string | undefined {
  const map: Record<string, string> = {
    rust: 'rust', typescript: 'typescript', javascript: 'javascript',
    python: 'python', go: 'go', ruby: 'ruby', java: 'java',
    json: 'json', yaml: 'yaml', toml: 'ini', css: 'css',
    html: 'xml', bash: 'bash', sql: 'sql', xml: 'xml',
    c: 'c', cpp: 'cpp', markdown: 'markdown', plaintext: 'plaintext',
  };
  return map[language];
}

function CodePreview({ content, language }: { content: string; language: string }) {
  const highlighted = useMemo(() => {
    const lang = hljsLang(language);
    if (lang && lang !== 'plaintext') {
      try {
        return hljs.highlight(content, { language: lang }).value;
      } catch {
        // fallback
      }
    }
    return null;
  }, [content, language]);

  const lineCount = content.split('\n').length;
  const lineNumbers = useMemo(() => {
    const nums: string[] = [];
    for (let i = 1; i <= lineCount; i++) nums.push(String(i));
    return nums.join('\n');
  }, [lineCount]);

  return (
    <div className="flex h-full overflow-auto text-xs font-mono leading-relaxed">
      {/* Line numbers — single pre for performance */}
      <pre className="shrink-0 py-4 pl-4 pr-2 select-none text-right text-stone-600 border-r border-white/[0.04]">
        {lineNumbers}
      </pre>
      {/* Code */}
      <pre className="flex-1 py-4 pl-3 pr-4 overflow-x-auto">
        {highlighted ? (
          <code
            className="hljs"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          <code className="text-stone-200">{content}</code>
        )}
      </pre>
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className={`p-6 overflow-auto h-full ${proseClasses}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeEditor({ content, language, onChange }: { content: string; language: string; onChange: (v: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  // Debounced highlighting — only re-highlight after 150ms idle
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => {
      const lang = hljsLang(language);
      if (lang && lang !== 'plaintext') {
        try {
          setHighlightedHtml(hljs.highlight(content, { language: lang }).value);
          return;
        } catch {}
      }
      setHighlightedHtml(null);
    }, 150);
    return () => clearTimeout(highlightTimer.current);
  }, [content, language]);

  // Sync scroll between textarea and highlighted pre
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Add a trailing space so pre height matches textarea when content ends with newline
  const displayContent = content.endsWith('\n') ? content + ' ' : content;

  // Line count for gutter — only recompute when line count changes
  const lineCount = useMemo(() => content.split('\n').length, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newValue = content.substring(0, start) + '  ' + content.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  // Generate line numbers as a single string to avoid N div renders
  const lineNumbers = useMemo(() => {
    const nums: string[] = [];
    for (let i = 1; i <= lineCount; i++) nums.push(String(i));
    return nums.join('\n');
  }, [lineCount]);

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Line numbers — single pre element, not N divs */}
      <pre className="shrink-0 py-4 pl-4 pr-2 select-none text-right text-stone-600 text-xs font-mono leading-relaxed border-r border-white/[0.04] overflow-hidden">
        {lineNumbers}
      </pre>

      {/* Editor area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Highlighted layer (behind) */}
        <pre
          ref={preRef}
          className="absolute inset-0 py-4 pl-3 pr-4 overflow-hidden text-xs font-mono leading-relaxed pointer-events-none"
          aria-hidden="true"
        >
          {highlightedHtml ? (
            <code className="hljs" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
          ) : (
            <code className="text-stone-200">{displayContent}</code>
          )}
        </pre>

        {/* Transparent textarea (on top) */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-stone-200 text-xs leading-relaxed font-mono py-4 pl-3 pr-4 resize-none focus:outline-none selection:bg-amber-500/30 overflow-auto"
          style={{ caretColor: 'rgb(214, 211, 209)' }}
        />
      </div>
    </div>
  );
}

export default function Canvas() {
  const { file, isOpen, close, updateContent, save } = useCanvas();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('preview');

  // Reset to preview when a new file opens
  useEffect(() => {
    setMode('preview');
  }, [file?.path]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      // Don't intercept keys when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') {
        // Only handle Escape and Cmd+S in inputs
        if (e.key === 'Escape') { close(); return; }
        if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); return; }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    },
    [isOpen, close, save]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen && mode === 'edit' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, mode, file?.path]);

  if (!file && !isOpen) return null;

  const isMarkdown = file?.language === 'markdown';

  return (
    <div
      className={`shrink-0 h-screen flex flex-col transition-all duration-200 ease-out ${
        isOpen
          ? 'w-[40vw] min-w-[360px] max-w-[720px] opacity-100 translate-x-0'
          : 'w-0 min-w-0 opacity-0 translate-x-4 overflow-hidden'
      }`}
    >
      <div className="flex flex-col h-full glass-strong border-l border-white/[0.08]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-stone-100 text-xs font-mono truncate" title={file?.path}>
              {file ? truncatePath(file.path) : ''}
            </span>
            {file && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-stone-400 shrink-0">
                {file.language}
              </span>
            )}
            {file?.dirty && (
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Mode toggle */}
            <div className="flex rounded-md border border-white/[0.08] overflow-hidden mr-1">
              <button
                onClick={() => setMode('preview')}
                className={`text-[10px] px-2 py-1 transition-colors ${
                  mode === 'preview'
                    ? 'bg-white/[0.1] text-stone-200'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setMode('edit')}
                className={`text-[10px] px-2 py-1 transition-colors ${
                  mode === 'edit'
                    ? 'bg-white/[0.1] text-stone-200'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                Edit
              </button>
            </div>
            {file?.dirty && (
              <button
                onClick={() => save()}
                className="text-xs px-2 py-1 rounded-md bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/20 transition-colors"
              >
                Save
              </button>
            )}
            <button
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-stone-500 hover:text-stone-200 transition-colors text-sm"
              title="Close (Esc)"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {file && mode === 'edit' && (
            isMarkdown ? (
              <div className="flex h-full overflow-auto">
                {/* Line numbers — single pre for performance */}
                <pre className="shrink-0 py-4 pl-4 pr-2 select-none text-right text-stone-600 text-xs font-mono leading-relaxed border-r border-white/[0.04]">
                  {Array.from({ length: file.content.split('\n').length }, (_, i) => i + 1).join('\n')}
                </pre>
                <textarea
                  ref={textareaRef}
                  value={file.content}
                  onChange={(e) => updateContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const el = e.currentTarget;
                      const start = el.selectionStart;
                      const end = el.selectionEnd;
                      const newValue = file.content.substring(0, start) + '  ' + file.content.substring(end);
                      updateContent(newValue);
                      requestAnimationFrame(() => {
                        el.selectionStart = el.selectionEnd = start + 2;
                      });
                    }
                  }}
                  spellCheck={false}
                  className="flex-1 h-full bg-transparent text-stone-200 text-xs leading-relaxed font-mono py-4 pl-3 pr-4 resize-none focus:outline-none"
                  style={{ minHeight: '100%' }}
                />
              </div>
            ) : (
              <CodeEditor
                content={file.content}
                language={file.language}
                onChange={updateContent}
              />
            )
          )}
          {file && mode === 'preview' && (
            isMarkdown
              ? <MarkdownPreview content={file.content} />
              : <CodePreview content={file.content} language={file.language} />
          )}
        </div>
      </div>
    </div>
  );
}
