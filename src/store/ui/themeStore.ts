import { create } from 'zustand';

export type Theme = 'light' | 'dark';

const KEY = 'oj-theme';

/* index.html applies the saved theme before first paint; read it back from there. */
const initial = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

export const useThemeStore = create<{ theme: Theme }>(() => ({ theme: initial() }));

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: the choice just isn't remembered */
  }
  useThemeStore.setState({ theme });
}

export const toggleTheme = (): void => setTheme(useThemeStore.getState().theme === 'dark' ? 'light' : 'dark');
