import { useState } from 'react';
import { PRIVACY_LINE } from '../lib/constants';
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme';
import { usePwaInstall } from '../lib/usePwaInstall';

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
  const install = usePwaInstall();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-9 px-4 py-10 sm:px-6">
      <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-ink sm:text-[40px]">
        Settings
      </h1>

      {install.kind !== 'unsupported' && (
        <section className="space-y-2">
          <h2 className="text-[15px] font-extrabold tracking-tight text-ink">Install</h2>
          {install.kind === 'installable' && (
            <>
              <p className="text-[14.5px] leading-relaxed text-ink-dim">
                Add PaperPal to your device for a full-screen app and offline access.
              </p>
              <button
                type="button"
                onClick={install.promptInstall}
                className="rounded-full bg-brand px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-brand-deep"
              >
                Install app
              </button>
            </>
          )}
          {install.kind === 'ios-hint' && (
            <p className="text-[14.5px] leading-relaxed text-ink-dim">
              To install: tap the Share button, then &ldquo;Add to Home Screen&rdquo;.
            </p>
          )}
          {install.kind === 'installed' && (
            <p className="text-[14.5px] leading-relaxed text-ink-dim">
              PaperPal is installed and runs offline once each tool has been used.
            </p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-[15px] font-extrabold tracking-tight text-ink">Appearance</h2>
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                setTheme(o.id);
                setThemePref(o.id);
              }}
              className={`rounded-full border-2 px-4 py-2 text-[14px] font-bold transition-colors ${
                theme === o.id
                  ? 'border-brand bg-chip text-brand'
                  : 'border-line text-ink-dim hover:border-fold hover:text-ink'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[15px] font-extrabold tracking-tight text-ink">Privacy</h2>
        <p className="text-[14.5px] leading-relaxed text-ink-dim">
          {PRIVACY_LINE} There is no server, no account, and no analytics. The tools use
          WebAssembly engines that run inside this browser tab. You can open your browser&rsquo;s
          network panel to confirm nothing is sent anywhere.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-[15px] font-extrabold tracking-tight text-ink">About</h2>
        <p className="text-[14.5px] leading-relaxed text-ink-dim">
          PaperPal is open source under the AGPL-3.0 license. It&rsquo;s built with React, Vite,
          MuPDF, Ghostscript, and pdf-lib.
        </p>
        <a
          href="https://github.com/Natchaponsor/pdf-tools"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-block text-[14.5px] font-bold text-brand transition-colors hover:text-brand-deep"
        >
          Source code on GitHub
        </a>
      </section>
    </div>
  );
}
