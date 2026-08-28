import { useEffect, useRef, useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { FileRow, ResultWithPreview } from './AddPageNumbers';
import { addWatermark, type WatermarkOptions } from '../lib/pdf';
import { renderFirstPage } from '../lib/pdfDoc';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';
import { bytesToBlob } from '../lib/download';

export function AddWatermark() {
  const [file, setFile] = useState<File | null>(null);
  const [opts, setOpts] = useState<WatermarkOptions>({
    text: 'CONFIDENTIAL',
    opacity: 0.2,
    fontSize: 60,
    layout: 'diagonal',
    color: [0.15, 0.15, 0.15],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; bytes: number; preview?: string } | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const set = <K extends keyof WatermarkOptions>(k: K, v: WatermarkOptions[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await addWatermark(file, opts);
      const blob = bytesToBlob(bytes, 'application/pdf');
      let preview: string | undefined;
      try {
        const img = await renderFirstPage(blob);
        preview = URL.createObjectURL(img.blob);
        urls.current.push(preview);
      } catch {
        /* optional */
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

  return (
    <ToolShell title="Add watermark" blurb="Overlay text across every page, with adjustable opacity and angle.">
      {error && <Notice tone="error">{error}</Notice>}

      {!file && <FileDrop accept="application/pdf,.pdf" hint="One PDF" onFiles={(f) => setFile(f[0] ?? null)} />}

      {file && !result && (
        <div className="space-y-5">
          <FileRow file={file} onClear={reset} />

          <label className="block">
            <span className="text-sm font-semibold text-ink-700 dark:text-white/80">Text</span>
            <input
              type="text"
              value={opts.text}
              maxLength={60}
              onChange={(e) => set('text', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/10"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {(['diagonal', 'horizontal'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => set('layout', l)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium capitalize ${
                  opts.layout === l
                    ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                    : 'border-paper-200 dark:border-white/15'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-ink-700 dark:text-white/80">
              Opacity ({Math.round(opts.opacity * 100)}%)
            </span>
            <input
              type="range"
              min={5}
              max={80}
              value={Math.round(opts.opacity * 100)}
              onChange={(e) => set('opacity', Number(e.target.value) / 100)}
              className="mt-2 w-full accent-brand-600"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink-700 dark:text-white/80">
              Size ({opts.fontSize}pt)
            </span>
            <input
              type="range"
              min={16}
              max={120}
              value={opts.fontSize}
              onChange={(e) => set('fontSize', Number(e.target.value))}
              className="mt-2 w-full accent-brand-600"
            />
          </label>

          {busy ? (
            <ProgressBar ratio={null} label="Applying watermark…" />
          ) : (
            <button
              type="button"
              onClick={run}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
            >
              Add watermark
            </button>
          )}
        </div>
      )}

      {result && (
        <ResultWithPreview
          headline="Watermark added"
          detail={formatBytes(result.bytes)}
          preview={result.preview}
          filename={(file?.name.replace(/\.pdf$/i, '') ?? 'document') + '-watermarked.pdf'}
          blob={result.blob}
          onReset={reset}
        />
      )}
    </ToolShell>
  );
}
