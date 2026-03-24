'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { readFile, writeFile } from '@/lib/api';

interface CanvasFile {
  path: string;
  content: string;
  language: string;
  dirty: boolean;
}

interface CanvasContextType {
  file: CanvasFile | null;
  isOpen: boolean;
  error: string | null;
  workingDir: string;
  setWorkingDir: (dir: string) => void;
  openFile: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
  close: () => void;
  updateContent: (content: string) => void;
  save: () => Promise<void>;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    rs: 'rust', py: 'python', go: 'go', rb: 'ruby', java: 'java',
    md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
    toml: 'toml', css: 'css', html: 'html', sh: 'bash', bash: 'bash',
    sql: 'sql', xml: 'xml', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
  };
  return map[ext] ?? 'plaintext';
}

const DEFAULT_WORKING_DIR = '/home/ubuntu/forge';

/** Resolve a path to absolute, using workingDir for relative paths */
function resolvePath(path: string, workingDir: string): string {
  if (path.startsWith('/')) return path;
  // If workingDir is relative or '.', use default
  const base = (workingDir && workingDir !== '.' && workingDir.startsWith('/'))
    ? workingDir.replace(/\/$/, '')
    : DEFAULT_WORKING_DIR;
  // Strip leading ./ from path
  const rel = path.replace(/^\.\//, '');
  return `${base}/${rel}`;
}

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<CanvasFile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [workingDir, setWorkingDir] = useState(DEFAULT_WORKING_DIR);

  // Use ref for content during editing to avoid context re-renders on every keystroke.
  // The file state only updates on open/save/close — not per character.
  const editContentRef = useRef<string>('');
  const dirtyRef = useRef(false);

  const openFile = useCallback(async (rawPath: string) => {
    // Skip directories
    if (rawPath.endsWith('/')) return;

    const path = resolvePath(rawPath, workingDir);
    setCanvasError(null);
    try {
      const data = await readFile(path);
      const content = data.content;
      editContentRef.current = content;
      dirtyRef.current = false;
      setFile({
        path: data.path ?? path,
        content,
        language: data.language ?? detectLanguage(path),
        dirty: false,
      });
      setIsOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('404') || msg.includes('not found')) {
        setCanvasError(`File not found: ${rawPath}`);
      } else {
        setCanvasError(`Cannot open: ${msg}`);
      }
      setTimeout(() => setCanvasError(null), 4000);
    }
  }, [workingDir]);

  const refresh = useCallback(async () => {
    if (!file) return;
    try {
      const data = await readFile(file.path);
      editContentRef.current = data.content;
      dirtyRef.current = false;
      setFile({
        path: data.path ?? file.path,
        content: data.content,
        language: data.language ?? file.language,
        dirty: false,
      });
    } catch {
      // file may have been deleted — ignore
    }
  }, [file]);

  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const close = useCallback(() => {
    setIsOpen(false);
    dirtyRef.current = false;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setFile(null), 200);
  }, []);

  // updateContent updates the ref immediately (no re-render) and debounces the state update
  const updateTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const updateContent = useCallback((content: string) => {
    editContentRef.current = content;
    dirtyRef.current = true;
    // Debounce state update to 100ms — avoids re-rendering the whole app on every keystroke
    clearTimeout(updateTimer.current);
    updateTimer.current = setTimeout(() => {
      setFile((prev) => prev ? { ...prev, content, dirty: true } : null);
    }, 100);
  }, []);

  const save = useCallback(async () => {
    if (!file) return;
    const content = editContentRef.current;
    try {
      await writeFile(file.path, content);
      dirtyRef.current = false;
      setFile((prev) => prev ? { ...prev, content, dirty: false } : null);
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }, [file]);

  return (
    <CanvasContext.Provider value={{ file, isOpen, error: canvasError, workingDir, setWorkingDir, openFile, refresh, close, updateContent, save }}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas(): CanvasContextType {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error('useCanvas must be used within a CanvasProvider');
  return ctx;
}
