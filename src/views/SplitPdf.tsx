import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { DownloadCard } from '../components/DownloadCard';
import { SaveAs } from '../components/SaveAs';
import { FileRow } from './AddPageNumbers';
import { extractPages, parsePageRanges, splitToSinglePages } from '../lib/pdf';
import { usePageThumbnails } from '../lib/usePageThumbnails';
import { zipFiles } from '../lib/zip';
import { bytesToBlob } from '../lib/download';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';

type OutputMode = 'combined' | 'separate';

type Result =
  | { kind: 'pdf'; blob: Blob; bytes: number }
  | { kind: 'zip'; blob: Blob; count: number };

export function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [outputMode, setOutputMode] = useState<OutputMode>('combined');
  const [rangeText, setRangeText] = useState('');
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const outUrl = useRef<string | null>(null);

  const { pages, pageCount, loading, error: loadError } = usePageThumbnails(file);

  useEffect(() => () => {
    if (outUrl.current) URL.revokeObjectURL(outUrl.current);
  }, []);

  // Reset selection whenever a new document is opened.
  useEffect(() => {
    setSelected(new Set());
    setResult(null);
    setRangeText('');
    setRangeError(null);
  }, [file]);

  const sortedSelection = useMemo(
    () => [...selected].sort((a, b) => a - b),
    [selected],
  );

  function toggle(index: number) {
    setResult(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  function setAll(fn: (i: number) => boolean) {
    setResult(null);
    setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i).filter(fn)));
  }

  function applyRange() {
    setRangeError(null);
    try {
      const indices = parsePageRanges(rangeText, pageCount);
      setResult(null);
      setSelected(new Set(indices));
    } catch (err) {
      setRangeError(err instanceof Error ? err.message : 'Invalid range.');
    }
  }

  async function run() {
    if (!file || !sortedSelection.length) return;
    setBusy(true);
    setError(null);
    try {
      if (outputMode === 'separate') {
        const parts = await splitToSinglePages(file, sortedSelection);
        const blob = await zipFiles(parts.map((p) => ({ name: p.name, data: p.bytes })));
        setResult({ kind: 'zip', blob, count: parts.length });
      } else {
        const bytes = await extractPages(file, sortedSelection);
        const blob = bytesToBlob(bytes, 'application/pdf');
        outUrl.current = URL.createObjectURL(blob);
        setResult({ kind: 'pdf', blob, bytes: bytes.byteLength });
      }
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

  const base = file?.name.replace(/\.pdf$/i, '') ?? 'pages';
  const count = sortedSelection.length;

  return (
    <ToolShell
      title="Split PDF"
      blurb="Pick the exact pages you want, then pull them out as one PDF or a zip of single pages."
    >
      {(error || loadError) && <Notice tone="error">{error ?? loadError}</Notice>}

      {!file && <FileDrop accept="application/pdf,.pdf" hint="One PDF" onFiles={(f) => setFile(f[0] ?? null)} />}

      {file && result?.kind === 'pdf' && (
        <DownloadCard
          headline={`${count} page${count > 1 ? 's' : ''} extracted`}
          detail={formatBytes(result.bytes)}
          filename={`${base}-extract.pdf`}
          blob={result.blob}
          onReset={reset}
        />
      )}

      {file && result?.kind === 'zip' && (
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

      {file && !result && (
        <div className="space-y-4">
          <FileRow file={file} onClear={reset} />

          {loading && pages.length === 0 && <ProgressBar ratio={null} label="Opening PDF…" />}

          {pageCount > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="font-semibold text-ink-900 dark:text-white">
                  {count} of {pageCount} selected
                </span>
                <div className="flex gap-1.5">
                  <QuickButton onClick={() => setAll(() => true)}>All</QuickButton>
                  <QuickButton onClick={() => setAll(() => false)}>None</QuickButton>
                  <QuickButton onClick={() => setAll((i) => i % 2 === 0)}>Odd</QuickButton>
                  <QuickButton onClick={() => setAll((i) => i % 2 === 1)}>Even</QuickButton>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={rangeText}
                  onChange={(e) => setRangeText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyRange()}
                  placeholder="Select by range, e.g. 1-3, 5, 8-10"
                  className="min-w-0 flex-1 rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/10"
                />
                <button
                  type="button"
                  onClick={applyRange}
                  className="rounded-lg border border-paper-200 px-3 py-2 text-sm font-medium hover:bg-paper-100 dark:border-white/15 dark:hover:bg-white/10"
                >
                  Apply
                </button>
              </div>
              {rangeError && <p className="text-sm text-red-600 dark:text-red-400">{rangeError}</p>}

              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {pages.map((page) => {
                  const isSelected = selected.has(page.index);
                  return (
                    <li key={page.index}>
                      <button
                        type="button"
                        onClick={() => toggle(page.index)}
                        aria-pressed={isSelected}
                        aria-label={`Page ${page.index + 1}${isSelected ? ', selected' : ''}`}
                        className={`relative block w-full overflow-hidden rounded-lg border-2 transition-colors ${
                          isSelected
                            ? 'border-brand-500 ring-2 ring-brand-500/30'
                            : 'border-paper-200 hover:border-brand-300 dark:border-white/15'
                        }`}
                      >
                        <span className="block aspect-3/4 bg-white dark:bg-white/5">
                          {page.url ? (
                            <img
                              src={page.url}
                              alt=""
                              className={`h-full w-full object-contain ${isSelected ? '' : 'opacity-90'}`}
                            />
                          ) : (
                            <span className="grid h-full place-items-center text-xs text-ink-500">…</span>
                          )}
                        </span>
                        <span className="absolute left-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black/60 px-1 text-[10px] font-semibold text-white">
                          {page.index + 1}
                        </span>
                        <span
                          className={`absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${
                            isSelected
                              ? 'bg-brand-500 text-white'
                              : 'bg-white/80 text-ink-500 dark:bg-black/40'
                          }`}
                        >
                          {isSelected ? '✓' : '+'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {loading && pages.length > 0 && (
                <p className="text-xs text-ink-500 dark:text-white/50">
                  Loading previews… {pages.length}/{pageCount}
                </p>
              )}

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-ink-700 dark:text-white/80">Output</legend>
                <div className="flex flex-wrap gap-2">
                  <ModeButton active={outputMode === 'combined'} onClick={() => setOutputMode('combined')}>
                    One PDF with the selected pages
                  </ModeButton>
                  <ModeButton active={outputMode === 'separate'} onClick={() => setOutputMode('separate')}>
                    A .zip, one PDF per page
                  </ModeButton>
                </div>
              </fieldset>

              {busy ? (
                <ProgressBar ratio={null} label="Splitting…" />
              ) : (
                <button
                  type="button"
                  onClick={run}
                  disabled={count === 0}
                  className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {count === 0
                    ? 'Select at least one page'
                    : outputMode === 'combined'
                      ? `Extract ${count} page${count > 1 ? 's' : ''}`
                      : `Save ${count} page${count > 1 ? 's' : ''} as .zip`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </ToolShell>
  );
}

function QuickButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-paper-200 px-2 py-1 text-xs font-medium hover:bg-paper-100 dark:border-white/15 dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
        active
          ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
          : 'border-paper-200 dark:border-white/15'
      }`}
    >
      {children}
    </button>
  );
}
