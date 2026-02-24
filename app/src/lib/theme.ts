export type Theme = 'daylight' | 'glass-purple';
export const THEME_STORAGE_KEY = 'mededprep-theme';
export const THEMES: Theme[] = ['daylight', 'glass-purple'];

export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (saved === 'daylight' || saved === 'glass-purple') return saved;
  } catch {
    // localStorage unavailable (private browsing, security policy)
  }
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'glass-purple';
    }
  } catch {
    // matchMedia unavailable
  }
  return 'daylight';
}
