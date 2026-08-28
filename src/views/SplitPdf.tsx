import { useEffect, useRef, useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { DownloadCard } from '../components/DownloadCard';
import { ProgressBar } from '../components/ProgressBar';
import {
  extractPages,
  getPageCount,
  parsePageRanges,
  splitToSinglePages,
} from '../lib/pdf';
import { zipFiles } from '../lib/zip';
import { bytesToBlob } from '../lib/download';
import { SaveAs } from '../components/SaveAs';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';

type Mode = 'range' | 'each';

export function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('range');
  const [ranges, setRanges] = useState('1-1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | { kind: 'pdf'; blob: Blob; bytes: number }
    | { kind: 'zip'; blob: Blob; count: number }
    | null
  >(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  async function pick(files: File[]) {
    const next = files[0] ?? null;
    setFile(next);
    setResult(null);
    setError(null);
    setPageCount(null);
    if (next) {
      try {
        const count = await getPageCount(next);
        setPageCount(count);
        setRanges(`1-${count}`);
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
      if (mode === 'each') {
        const parts = await splitToSinglePages(file);
        const blob = await zipFiles(parts.map((p) => ({ name: p.name, data: p.bytes })));
        setResult({ kind: 'zip', blob, count: parts.length });
      } else {
        const indices = parsePageRanges(ranges, pageCount ?? 0);
        const bytes = await extractPages(file, indices);
        const blob = bytesToBlob(bytes, 'application/pdf');
        urlRef.current = URL.createObjectURL(blob);
        setResult({ kind: 'pdf', blob, bytes: bytes.byteLength });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setFile(null);
    setPageCount(null);
    setResult(null);
    setError(null);
  }

  const base = file?.name.replace(/\.pdf$/i, '') ?? 'pages';

  return (
    <ToolShell title="Split PDF" blurb="Pull out a page range, or burst the PDF into single pages.">
      {error && <Notice tone="error">{error}</Notice>}

      {!file && (
        <FileDrop accept="application/pdf,.pdf" hint="One PDF" onFiles={pick} />
      )}

      {file && !result && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-paper-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <p className="truncate font-medium text-ink-900 dark:text-white">{file.name}</p>
            <p className="text-sm text-ink-500 dark:text-white/60">
              {formatBytes(file.size)}
              {pageCount != null ? ` · ${pageCount} pages` : ''}
            </p>
          </div>

          <fieldset className="space-y-3">
            <label className="flex gap-3">
              <input
                type="radio"
                name="mode"
                checked={mode === 'range'}
                onChange={() => setMode('range')}
                className="mt-1 accent-brand-600"
              />
              <span className="flex-1">
                <span className="block font-medium text-ink-900 dark:text-white">
                  Extract pages
                </span>
                <span className="mb-2 block text-sm text-ink-500 dark:text-white/60">
                  A range or list, e.g. <code>1-3, 5, 8-10</code>
                </span>
                <input
                  type="text"
                  value={ranges}
                  disabled={mode !== 'range'}
                  onChange={(e) => setRanges(e.target.value)}
                  className="w-full rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-white/15 dark:bg-white/10"
                />
              </span>
            </label>
            <label className="flex gap-3">
              <input
                type="radio"
                name="mode"
                checked={mode === 'each'}
                onChange={() => setMode('each')}
                className="mt-1 accent-brand-600"
              />
              <span>
                <span className="block font-medium text-ink-900 dark:text-white">
                  One PDF per page
                </span>
                <span className="block text-sm text-ink-500 dark:text-white/60">
                  Downloads a .zip of {pageCount ?? '—'} single-page PDFs
                </span>
              </span>
            </label>
          </fieldset>

          {busy ? (
            <ProgressBar ratio={null} label="Splitting…" />
          ) : (
            <button
              type="button"
              onClick={run}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
            >
              Split PDF
            </button>
          )}
        </div>
      )}

      {result?.kind === 'pdf' && (
        <DownloadCard
          headline="Pages extracted"
          detail={formatBytes(result.bytes)}
          filename={`${base}-extract.pdf`}
          blob={result.blob}
          onReset={reset}
        />
      )}

      {result?.kind === 'zip' && (
        <div className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
          <p className="text-xl font-bold text-brand-800 dark:text-brand-200">
            {result.count} single-page PDFs
          </p>
          <SaveAs blob={result.blob} defaultName={`${base}-pages.zip`} />
          <button
            type="button"
            onClick={reset}
            className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            Start over
          </button>
        </div>
      )}
    </ToolShell>
  );
}
