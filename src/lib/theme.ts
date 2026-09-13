export type ThemePref =
  | 'system'
  | 'light'
  | 'dark'
  | 'spring'
  | 'summer'
  | 'fall'
  | 'winter';
export type ResolvedTheme = Exclude<ThemePref, 'system'>;

const KEY = 'paperpal:theme';
/** Pre-rename key. Read once so the Paperplane-era choice survives the rebrand. */
const LEGACY_KEY = 'paperplane:theme';
const PREFS: ThemePref[] = ['system', 'light', 'dark', 'spring', 'summer', 'fall', 'winter'];
const DARKISH: ResolvedTheme[] = ['dark', 'winter'];
const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

/** Used until the visitor picks a theme in Settings. */
export const DEFAULT_THEME: ThemePref = 'light';

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
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
  syncBrowserChrome();
}

/**
 * Point `<meta name="theme-color">` at the page's own background.
 *
 * On a phone this is what the browser paints behind the page: the address bar
 * area, the status bar, and whatever shows through the safe area. It was pinned
 * to the brand blue, so every theme had a blue surround that had nothing to do
 * with the palette in use. Read from the computed value rather than a second
 * table of colours, so it can never drift from the theme it is meant to match.
 */
function syncBrowserChrome(): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const page = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-page')
    .trim();
  if (page) meta.setAttribute('content', page);
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
