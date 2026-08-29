import { useState } from 'react';
import { PRIVACY_LINE } from '../lib/constants';
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme';

const OPTIONS: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'spring', label: 'Spring' },
  { id: 'summer', label: 'Summer' },
  { id: 'fall', label: 'Fall' },
  { id: 'winter', label: 'Winter' },
];

export function Settings() {
  const [theme, setTheme] = useState<ThemePref>(getThemePref);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-700 dark:text-white/80">Appearance</h2>
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                setTheme(o.id);
                setThemePref(o.id);
              }}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                theme === o.id
                  ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                  : 'border-paper-200 dark:border-white/15'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink-700 dark:text-white/80">Privacy</h2>
        <p className="text-sm text-ink-500 dark:text-white/60">
          {PRIVACY_LINE} There is no server, no account, and no analytics. The tools use
          WebAssembly engines that run inside this browser tab. You can open your browser&rsquo;s
          network panel to confirm nothing is sent anywhere.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink-700 dark:text-white/80">About</h2>
        <p className="text-sm text-ink-500 dark:text-white/60">
          Paperplane is open source under the AGPL-3.0 license. It&rsquo;s built with React, Vite,
          MuPDF, Ghostscript, and pdf-lib.
        </p>
        <a
          href="https://github.com/Natchaponsor/pdf-tools"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-block text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
        >
          Source code on GitHub →
        </a>
      </section>
    </div>
  );
}
