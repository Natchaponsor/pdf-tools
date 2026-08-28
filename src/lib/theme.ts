export type ThemePref = 'system' | 'light' | 'dark' | 'spring';
export type ResolvedTheme = 'light' | 'dark' | 'spring';

const KEY = 'paperplane:theme';
const PREFS: ThemePref[] = ['system', 'light', 'dark', 'spring'];
const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'wygins') return 'spring'; // renamed
    if (v && (PREFS as string[]).includes(v)) return v as ThemePref;
  } catch {
    /* storage may be unavailable */
  }
  return 'system';
}

function resolve(pref: ThemePref): ResolvedTheme {
  if (pref === 'system') return mq().matches ? 'dark' : 'light';
  return pref;
}

export function applyTheme(pref: ThemePref): void {
  const resolved = resolve(pref);
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = resolved === 'dark' ? 'dark' : 'light';
}

export function setThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* ignore */
  }
  applyTheme(pref);
}

/** Call once at startup. Keeps "system" mode live when the OS theme changes. */
export function initTheme(): void {
  applyTheme(getThemePref());
  mq().addEventListener('change', () => {
    if (getThemePref() === 'system') applyTheme('system');
  });
}
