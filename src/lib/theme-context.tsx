'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeColor = 'ember' | 'verdant' | 'ocean' | 'violet' | 'rose' | 'mono';
export type ThemeMode = 'dark' | 'light';
export type ThemeId = `${ThemeColor}-${ThemeMode}`;

export interface ThemeMeta {
  color: ThemeColor;
  name: string;
  description: string;
  swatch: string; // CSS color for the preview dot
}

export const THEME_COLORS: ThemeMeta[] = [
  { color: 'ember', name: 'Ember', description: 'Warm amber tones', swatch: '#f59e0b' },
  { color: 'verdant', name: 'Verdant', description: 'Terminal green', swatch: '#10b981' },
  { color: 'ocean', name: 'Ocean', description: 'Deep blue depths', swatch: '#3b82f6' },
  { color: 'violet', name: 'Violet', description: 'Purple haze', swatch: '#8b5cf6' },
  { color: 'rose', name: 'Rosé', description: 'Soft warm pink', swatch: '#f43f5e' },
  { color: 'mono', name: 'Mono', description: 'Pure grayscale', swatch: '#a1a1aa' },
];

interface ThemeContextType {
  themeColor: ThemeColor;
  themeMode: ThemeMode;
  themeId: ThemeId;
  setThemeColor: (color: ThemeColor) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  meta: ThemeMeta;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeColor, setThemeColorState] = useState<ThemeColor>('ember');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    // On first mount, check localStorage
    const storedColor = localStorage.getItem('forge-theme-color') as ThemeColor | null;
    const storedMode = localStorage.getItem('forge-theme-mode') as ThemeMode | null;

    // Migration from old format
    const oldTheme = localStorage.getItem('forge-theme');
    if (oldTheme && !storedColor) {
      const parts = oldTheme.split('-');
      const mode = parts.pop() as ThemeMode;
      const color = parts.join('-') as ThemeColor;
      if (THEME_COLORS.some((t) => t.color === color)) {
        setThemeColorState(color);
        setThemeModeState(mode === 'light' ? 'light' : 'dark');
        localStorage.setItem('forge-theme-color', color);
        localStorage.setItem('forge-theme-mode', mode);
        localStorage.removeItem('forge-theme');
        return;
      }
    }

    if (storedColor && THEME_COLORS.some((t) => t.color === storedColor)) {
      setThemeColorState(storedColor);
    }
    if (storedMode === 'light' || storedMode === 'dark') {
      setThemeModeState(storedMode);
    }
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('dark', 'light');
    html.classList.add(themeMode);
    html.setAttribute('data-theme', `${themeColor}-${themeMode}`);
    html.setAttribute('data-color', themeColor);
  }, [themeColor, themeMode]);

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    localStorage.setItem('forge-theme-color', color);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('forge-theme-mode', mode);
  };

  const toggleMode = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  const meta = THEME_COLORS.find((t) => t.color === themeColor)!;
  const themeId: ThemeId = `${themeColor}-${themeMode}`;

  return (
    <ThemeContext.Provider value={{
      themeColor,
      themeMode,
      themeId,
      setThemeColor,
      setThemeMode,
      toggleMode,
      meta,
      isDark: themeMode === 'dark',
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
