import { useEffect, useRef, useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { FileRow } from './AddPageNumbers';
import { openDoc, getPageCount, renderPage, type RasterFormat } from '../lib/pdfDoc';
import { parsePageRanges } from '../lib/pdf';
import { zipFiles } from '../lib/zip';
import { downloadBlob } from '../lib/download';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';

const DPIS = [72, 150, 300] as const;

export function PdfToImage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [format, setFormat] = useState<RasterFormat>('png');
  const [dpi, setDpi] = useState<(typeof DPIS)[number]>(150);
  const [scope, setScope] = useState<'all' | 'range'>('all');
  const [ranges, setRanges] = useState('1');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    { kind: 'image'; blob: Blob; name: string } | { kind: 'zip'; blob: Blob; count: number } | null
  >(null);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function pick(files: File[]) {
    const next = files[0] ?? null;
    setResult(null);
    setError(null);
    setPageCount(null);
    setFile(next);
    if (next) {
      try {
        setPageCount(await getPageCount(next));
      } catch (err) {
        setError(errorMessage(err));
        setFile(null);
      }
    }
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const doc = await openDoc(file);
      const pages =
        scope === 'all'
          ? Array.from({ length: doc.pageCount }, (_, i) => i + 1)
          : parsePageRanges(ranges, doc.pageCount).map((i) => i + 1);
      setProgress({ done: 0, total: pages.length });

      const base = file.name.replace(/\.pdf$/i, '');
      const ext = format === 'png' ? 'png' : 'jpg';
      const pad = String(Math.max(...pages)).length;
      const images: { name: string; data: Blob }[] = [];
      for (let i = 0; i < pages.length; i++) {
        setProgress({ done: i, total: pages.length });
        const { blob } = await renderPage(doc.docId, pages[i] - 1, { dpi, format });
        images.push({ name: `${base}-p${String(pages[i]).padStart(pad, '0')}.${ext}`, data: blob });
      }
      doc.close();

      if (images.length === 1) {
        setResult({ kind: 'image', blob: images[0].data, name: images[0].name });
      } else {
        const zip = await zipFiles(images);
        setResult({ kind: 'zip', blob: zip, count: images.length });
      }
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
    setPageCount(null);
    setResult(null);
    setError(null);
  }

  const base = file?.name.replace(/\.pdf$/i, '') ?? 'pages';

  return (
    <ToolShell title="PDF to image" blurb="Render pages to PNG or JPG. One page downloads directly; several come as a zip.">
      {error && <Notice tone="error">{error}</Notice>}

      {!file && <FileDrop accept="application/pdf,.pdf" hint="One PDF" onFiles={pick} />}

      {file && !result && (
        <div className="space-y-5">
          <FileRow file={file} onClear={reset} />
          {pageCount != null && (
            <p className="text-sm text-ink-500 dark:text-white/60">{pageCount} pages</p>
          )}

          <Segmented
            label="Format"
            value={format}
            options={[
              ['png', 'PNG'],
              ['jpeg', 'JPG'],
            ]}
            onChange={setFormat}
          />
          <Segmented
            label="Resolution"
            value={String(dpi)}
            options={DPIS.map((d) => [String(d), `${d} DPI`] as [string, string])}
            onChange={(v) => setDpi(Number(v) as (typeof DPIS)[number])}
          />

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-ink-700 dark:text-white/80">Pages</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} className="accent-brand-600" />
              All pages
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={scope === 'range'} onChange={() => setScope('range')} className="accent-brand-600" />
              <span>Range</span>
              <input
                type="text"
                value={ranges}
                disabled={scope !== 'range'}
                onChange={(e) => setRanges(e.target.value)}
                placeholder="1-3, 5"
                className="w-32 rounded-lg border border-paper-200 bg-white px-2 py-1 disabled:opacity-50 dark:border-white/15 dark:bg-white/10"
              />
            </label>
          </fieldset>

          {busy ? (
            <ProgressBar
              ratio={progress.total ? progress.done / progress.total : null}
              label={`Rendering page ${progress.done + 1} of ${progress.total}…`}
            />
          ) : (
            <button
              type="button"
              onClick={run}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
            >
              Convert to {format === 'png' ? 'PNG' : 'JPG'}
            </button>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
          <p className="text-xl font-bold text-brand-800 dark:text-brand-200">
            {result.kind === 'image' ? 'Image ready' : `${result.count} images`}
          </p>
          <p className="text-sm text-ink-500 dark:text-white/60">{formatBytes(result.blob.size)}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                downloadBlob(
                  result.blob,
                  result.kind === 'image' ? result.name : `${base}-images.zip`,
                )
              }
              className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
            >
              Download{result.kind === 'zip' ? ' .zip' : ''}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-brand-300 px-4 py-2.5 font-semibold text-brand-700 hover:bg-white dark:border-brand-700 dark:text-brand-200 dark:hover:bg-white/10"
            >
              Start over
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink-700 dark:text-white/80">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([val, text]) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              value === val
                ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                : 'border-paper-200 dark:border-white/15'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
