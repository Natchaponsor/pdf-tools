export type ThemePref =
  | 'system'
  | 'light'
  | 'dark'
  | 'spring'
  | 'summer'
  | 'fall'
  | 'winter';
export type ResolvedTheme = Exclude<ThemePref, 'system'>;

const KEY = 'paperplane:theme';
const PREFS: ThemePref[] = ['system', 'light', 'dark', 'spring', 'summer', 'fall', 'winter'];
const DARKISH: ResolvedTheme[] = ['dark', 'winter'];
const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

/** Used until the visitor picks a theme in Settings. */
export const DEFAULT_THEME: ThemePref = 'light';

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'wygins') return 'spring'; // renamed
    if (v && (PREFS as string[]).includes(v)) return v as ThemePref;
  } catch {
    /* storage may be unavailable */
  }
  return DEFAULT_THEME;
}

function resolve(pref: ThemePref): ResolvedTheme {
  if (pref === 'system') return mq().matches ? 'dark' : 'light';
  return pref;
}

export function applyTheme(pref: ThemePref): void {
  const resolved = resolve(pref);
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = DARKISH.includes(resolved) ? 'dark' : 'light';
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
