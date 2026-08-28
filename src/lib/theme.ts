export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'paperplane:theme';
const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage may be unavailable */
  }
  return 'system';
}

function resolve(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'system') return mq().matches ? 'dark' : 'light';
  return pref;
}

export function applyTheme(pref: ThemePref): void {
  document.documentElement.setAttribute('data-theme', resolve(pref));
  document.documentElement.style.colorScheme = resolve(pref);
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
