import { useEffect, useRef, useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { bytesToBlob } from '../lib/download';
import { SaveAs } from '../components/SaveAs';
import { addPageNumbers, type Corner, type PageNumberOptions } from '../lib/pdf';
import { renderFirstPage } from '../lib/pdfDoc';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';

const CORNERS: Corner[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

export function AddPageNumbers() {
  const [file, setFile] = useState<File | null>(null);
  const [opts, setOpts] = useState<PageNumberOptions>({
    position: 'bottom-center',
    fontSize: 11,
    margin: 28,
    startAt: 1,
    format: 'n',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; bytes: number; preview?: string } | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await addPageNumbers(file, opts);
      const blob = bytesToBlob(bytes, 'application/pdf');
      let preview: string | undefined;
      try {
        const img = await renderFirstPage(blob);
        preview = URL.createObjectURL(img.blob);
        urls.current.push(preview);
      } catch {
        /* preview optional */
      }
      setResult({ blob, bytes: bytes.byteLength, preview });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
    setFile(null);
    setResult(null);
    setError(null);
  }

  const set = <K extends keyof PageNumberOptions>(k: K, v: PageNumberOptions[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  return (
    <ToolShell title="Add page numbers" blurb="Stamp page numbers onto every page. Choose the position and style.">
      {error && <Notice tone="error">{error}</Notice>}

      {!file && <FileDrop accept="application/pdf,.pdf" hint="One PDF" onFiles={(f) => setFile(f[0] ?? null)} />}

      {file && !result && (
        <div className="space-y-5">
          <FileRow file={file} onClear={reset} />

          <div>
            <p className="mb-2 text-sm font-semibold text-ink-700 dark:text-white/80">Position</p>
            <div className="grid w-40 grid-cols-3 gap-1.5">
              {CORNERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => set('position', c)}
                  className={`h-9 rounded-md border ${
                    opts.position === c
                      ? 'border-brand-500 bg-brand-500'
                      : 'border-paper-200 bg-white dark:border-white/15 dark:bg-white/5'
                  }`}
                />
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-ink-700 dark:text-white/80">Style</span>
            <select
              value={opts.format}
              onChange={(e) => set('format', e.target.value as PageNumberOptions['format'])}
              className="mt-1 block w-full rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/10"
            >
              <option value="n">1, 2, 3…</option>
              <option value="page-n">Page 1, Page 2…</option>
              <option value="n-of-total">1 / N, 2 / N…</option>
            </select>
          </label>

          <div className="flex gap-4">
            <label className="flex-1">
              <span className="text-sm font-semibold text-ink-700 dark:text-white/80">
                Size ({opts.fontSize}pt)
              </span>
              <input
                type="range"
                min={8}
                max={24}
                value={opts.fontSize}
                onChange={(e) => set('fontSize', Number(e.target.value))}
                className="mt-2 w-full accent-brand-600"
              />
            </label>
            <label className="w-24">
              <span className="text-sm font-semibold text-ink-700 dark:text-white/80">Start at</span>
              <input
                type="number"
                min={0}
                value={opts.startAt}
                onChange={(e) => set('startAt', Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/10"
              />
            </label>
          </div>

          {busy ? (
            <ProgressBar ratio={null} label="Stamping pages…" />
          ) : (
            <button
              type="button"
              onClick={run}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
            >
              Add page numbers
            </button>
          )}
        </div>
      )}

      {result && (
        <ResultWithPreview
          headline="Page numbers added"
          detail={formatBytes(result.bytes)}
          preview={result.preview}
          filename={(file?.name.replace(/\.pdf$/i, '') ?? 'document') + '-numbered.pdf'}
          blob={result.blob}
          onReset={reset}
        />
      )}
    </ToolShell>
  );
}

export function FileRow({ file, onClear }: { file: File; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-paper-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink-900 dark:text-white">{file.name}</p>
        <p className="text-sm text-ink-500 dark:text-white/60">{formatBytes(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 text-sm font-medium text-brand-700 dark:text-brand-300"
      >
        Change
      </button>
    </div>
  );
}

export function ResultWithPreview({
  headline,
  detail,
  preview,
  filename,
  blob,
  onReset,
}: {
  headline: string;
  detail: string;
  preview?: string;
  filename: string;
  blob: Blob;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
      <div className="flex gap-4">
        {preview && (
          <img
            src={preview}
            alt="First page preview"
            className="h-40 w-auto rounded-lg border border-paper-200 bg-white dark:border-white/10"
          />
        )}
        <div>
          <p className="text-xl font-bold text-brand-800 dark:text-brand-200">{headline}</p>
          <p className="mt-1 text-sm text-ink-500 dark:text-white/60">{detail}</p>
        </div>
      </div>
      <SaveAs blob={blob} defaultName={filename} />
      <button
        type="button"
        onClick={onReset}
        className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
      >
        Start over
      </button>
    </div>
  );
}
