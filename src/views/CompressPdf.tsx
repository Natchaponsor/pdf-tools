import { useEffect, useMemo, useRef, useState } from 'react';
import { FileDrop } from '../components/FileDrop';
import { ProgressBar } from '../components/ProgressBar';
import { MAX_COMPRESS_BYTES } from '../lib/constants';
import { formatBytes, formatDuration, percentSmaller } from '../lib/format';
import {
  COMPRESS_LEVELS,
  compressPdf,
  type CompressLevel,
  type CompressProgress,
} from '../lib/compress';

type Phase =
  | { kind: 'idle' }
  | { kind: 'working'; progress: CompressProgress }
  | { kind: 'done'; url: string; outputBytes: number; ms: number }
  | { kind: 'error'; message: string };

export function CompressPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<CompressLevel>('balanced');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const oversized = file != null && file.size > MAX_COMPRESS_BYTES;

  const resultPct = useMemo(() => {
    if (phase.kind !== 'done' || !file) return 0;
    return percentSmaller(file.size, phase.outputBytes);
  }, [phase, file]);

  function pickFile(files: File[]) {
    const next = files[0];
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPhase({ kind: 'idle' });
    if (next && next.type !== 'application/pdf' && !next.name.toLowerCase().endsWith('.pdf')) {
      setFile(null);
      setPhase({ kind: 'error', message: 'That file is not a PDF. Please choose a .pdf file.' });
      return;
    }
    setFile(next ?? null);
  }

  async function run() {
    if (!file || oversized) return;
    setPhase({ kind: 'working', progress: { ratio: null, note: 'Starting…' } });
    try {
      const outcome = await compressPdf(file, level, (progress) =>
        setPhase({ kind: 'working', progress }),
      );
      const url = URL.createObjectURL(outcome.blob);
      urlRef.current = url;
      setPhase({ kind: 'done', url, outputBytes: outcome.outputBytes, ms: outcome.ms });
    } catch (err) {
      setPhase({ kind: 'error', message: friendlyError(err) });
    }
  }

  function reset() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setFile(null);
    setPhase({ kind: 'idle' });
  }

  const downloadName = file ? file.name.replace(/\.pdf$/i, '') + '-compressed.pdf' : 'compressed.pdf';

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Compress PDF</h1>
        <p className="text-sm text-ink-500 dark:text-white/60">
          Shrink a PDF down for email or upload. Up to {formatBytes(MAX_COMPRESS_BYTES)}.
        </p>
      </header>

      {!file && (
        <FileDrop
          accept="application/pdf,.pdf"
          hint={`One PDF, up to ${formatBytes(MAX_COMPRESS_BYTES)}`}
          onFiles={pickFile}
        />
      )}

      {file && (
        <div className="rounded-2xl border border-paper-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink-900 dark:text-white">{file.name}</p>
              <p className="text-sm text-ink-500 dark:text-white/60">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-white/10"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {oversized && (
        <Notice tone="warn">
          This file is {formatBytes(file!.size)}, over the {formatBytes(MAX_COMPRESS_BYTES)} limit.
          Try splitting it first, or pick a smaller PDF.
        </Notice>
      )}

      {file && !oversized && phase.kind !== 'done' && (
        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-semibold text-ink-700 dark:text-white/80">
            Quality level
          </legend>
          {COMPRESS_LEVELS.map((info) => (
            <label
              key={info.id}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
                level === info.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                  : 'border-paper-200 bg-white hover:border-brand-300 dark:border-white/10 dark:bg-white/5'
              }`}
            >
              <input
                type="radio"
                name="level"
                value={info.id}
                checked={level === info.id}
                onChange={() => setLevel(info.id)}
                className="mt-1 accent-brand-600"
              />
              <span>
                <span className="block font-medium text-ink-900 dark:text-white">{info.label}</span>
                <span className="block text-sm text-ink-500 dark:text-white/60">{info.blurb}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {file && !oversized && phase.kind !== 'working' && phase.kind !== 'done' && (
        <button
          type="button"
          onClick={run}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          Compress PDF
        </button>
      )}

      {phase.kind === 'working' && (
        <div className="rounded-2xl border border-paper-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <ProgressBar ratio={phase.progress.ratio} label={phase.progress.note} />
          <p className="mt-3 text-xs text-ink-500 dark:text-white/50">
            Large scans can take a minute. The engine runs entirely in this tab.
          </p>
        </div>
      )}

      {phase.kind === 'error' && (
        <Notice tone="error">
          {phase.message}
          <button
            type="button"
            onClick={() => setPhase({ kind: 'idle' })}
            className="mt-2 block font-medium underline"
          >
            Try again
          </button>
        </Notice>
      )}

      {phase.kind === 'done' && file && (
        <div className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-bold text-brand-800 dark:text-brand-200">
              {resultPct > 0 ? `${resultPct}% smaller` : 'Already tightly packed'}
            </span>
            <span className="text-sm text-ink-500 dark:text-white/60">
              {formatBytes(file.size)} → {formatBytes(phase.outputBytes)} · {formatDuration(phase.ms)}
            </span>
          </div>
          {resultPct <= 0 && (
            <p className="text-sm text-ink-500 dark:text-white/60">
              This PDF didn&rsquo;t get smaller at this level. Try{' '}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => {
                  setLevel(level === 'light' ? 'balanced' : 'maximum');
                  setPhase({ kind: 'idle' });
                }}
              >
                a stronger level
              </button>
              .
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <a
              href={phase.url}
              download={downloadName}
              className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
            >
              Download
            </a>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-brand-300 px-4 py-2.5 font-semibold text-brand-700 hover:bg-white dark:border-brand-700 dark:text-brand-200 dark:hover:bg-white/10"
            >
              Compress another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Notice({ tone, children }: { tone: 'warn' | 'error'; children: React.ReactNode }) {
  const styles =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
      : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200';
  return <div className={`rounded-xl border p-4 text-sm ${styles}`}>{children}</div>;
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/password|encrypt|decrypt/i.test(message)) {
    return 'This PDF is password-protected. Remove the password in your PDF viewer, then try again.';
  }
  if (/load|fetch|wasm|network/i.test(message)) {
    return 'The compression engine could not load. Check your connection and reload the page.';
  }
  if (/damaged|repair|corrupt|not a PDF|trailer|xref/i.test(message)) {
    return 'This PDF looks damaged and could not be read. Try re-saving it from the source.';
  }
  return `Compression failed: ${message}`;
}
