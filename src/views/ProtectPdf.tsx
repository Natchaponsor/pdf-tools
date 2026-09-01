import { useEffect, useRef, useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { DownloadCard } from '../components/DownloadCard';
import { ProgressBar } from '../components/ProgressBar';
import { FileRow } from './AddPageNumbers';
import { protectPdf, unlockPdf, PERMISSIONS } from '../lib/secure';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';

type Mode = 'protect' | 'unlock';

export function ProtectPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>('protect');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [restrict, setRestrict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; bytes: number } | null>(null);
  const outUrl = useRef<string | null>(null);

  useEffect(() => () => {
    if (outUrl.current) URL.revokeObjectURL(outUrl.current);
  }, []);

  useEffect(() => {
    setPassword('');
    setRestrict(false);
    setResult(null);
    setError(null);
  }, [file, mode]);

  async function run() {
    if (!file || !password) return;
    setBusy(true);
    setError(null);
    try {
      const blob =
        mode === 'protect'
          ? await protectPdf(file, password, restrict ? PERMISSIONS.printOnly : PERMISSIONS.all)
          : await unlockPdf(file, password);
      outUrl.current = URL.createObjectURL(blob);
      setResult({ blob, bytes: blob.size });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    if (outUrl.current) URL.revokeObjectURL(outUrl.current);
    outUrl.current = null;
    setFile(null);
    setResult(null);
    setError(null);
  }

  const base = file?.name.replace(/\.pdf$/i, '') ?? 'document';
  const canRun = !!file && password.length > 0 && !busy;

  return (
    <ToolShell title="Protect PDF" blurb="Add a password to a PDF, or remove one you already know.">
      {error && <Notice tone="error">{error}</Notice>}

      {!file && (
        <FileDrop accept="application/pdf,.pdf" hint="One PDF" onFiles={(f) => setFile(f[0] ?? null)} />
      )}

      {file && result && (
        <DownloadCard
          headline={mode === 'protect' ? 'Password added' : 'Password removed'}
          detail={formatBytes(result.bytes)}
          filename={`${base}${mode === 'protect' ? '-protected' : '-unlocked'}.pdf`}
          blob={result.blob}
          onReset={reset}
        />
      )}

      {file && !result && (
        <div className="space-y-5">
          <FileRow file={file} onClear={reset} />

          <div className="inline-flex rounded-lg border border-paper-200 p-0.5 dark:border-white/15">
            {(['protect', 'unlock'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                  mode === m
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-500 hover:text-ink-900 dark:text-white/60 dark:hover:text-white'
                }`}
              >
                {m === 'protect' ? 'Protect' : 'Unlock'}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-ink-700 dark:text-white/80">
              {mode === 'protect' ? 'New password' : 'Current password'}
            </span>
            <span className="mt-1 flex items-center rounded-lg border border-paper-200 bg-white dark:border-white/15 dark:bg-white/10">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                autoComplete="off"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canRun && run()}
                className="min-w-0 flex-1 rounded-l-lg bg-transparent px-3 py-2.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="px-3 text-xs font-medium text-ink-500 hover:text-ink-900 dark:hover:text-white"
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>

          {mode === 'protect' && (
            <label className="flex gap-3">
              <input
                type="checkbox"
                checked={restrict}
                onChange={(e) => setRestrict(e.target.checked)}
                className="mt-1 accent-brand-600"
              />
              <span>
                <span className="block text-sm font-medium text-ink-900 dark:text-white">
                  Also block editing and copying
                </span>
                <span className="block text-sm text-ink-500 dark:text-white/60">
                  Printing stays allowed. Note: these restrictions are a courtesy — many PDF apps
                  ignore them. The password is the real protection.
                </span>
              </span>
            </label>
          )}

          {mode === 'protect' && (
            <Notice tone="info">
              Keep this password somewhere safe — a protected PDF can&rsquo;t be opened or recovered
              without it, here or anywhere else.
            </Notice>
          )}

          {busy ? (
            <ProgressBar ratio={null} label={mode === 'protect' ? 'Encrypting…' : 'Decrypting…'} />
          ) : (
            <button
              type="button"
              onClick={run}
              disabled={!canRun}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {mode === 'protect' ? 'Add password' : 'Remove password'}
            </button>
          )}
        </div>
      )}
    </ToolShell>
  );
}
