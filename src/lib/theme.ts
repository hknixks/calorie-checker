import { useEffect } from 'react';
import type { ThemeMode } from './types';

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

/**
 * Stamp the resolved theme on <html> so the CSS only has to handle two explicit
 * values. When the mode is "system" we also follow live OS changes.
 */
export function useTheme(mode: ThemeMode): void {
  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(mode);
      document.documentElement.dataset.theme = resolved;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', resolved === 'dark' ? '#131110' : '#fbf7f2');
    };
    apply();

    if (mode !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [mode]);
}
