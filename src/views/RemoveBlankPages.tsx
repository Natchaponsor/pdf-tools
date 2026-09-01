import { useEffect, useMemo, useRef, useState } from 'react';
import type { PageThumb } from '../lib/usePageThumbnails';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { DownloadCard } from '../components/DownloadCard';
import { FileRow } from './AddPageNumbers';
import { usePageThumbnails } from '../lib/usePageThumbnails';
import { useBlankDetection } from '../lib/useBlankDetection';
import { extractPages } from '../lib/pdf';
import { bytesToBlob } from '../lib/download';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';

const NO_PAGES: PageThumb[] = [];

export function RemoveBlankPages() {
  const [file, setFile] = useState<File | null>(null);
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; bytes: number } | null>(null);
  const outUrl = useRef<string | null>(null);

  const { pages, pageCount, loading, error: loadError } = usePageThumbnails(file);
  // Analyse only once every thumbnail is ready — keeps the detector's effect simple.
  const { blank, analyzing } = useBlankDetection(loading ? NO_PAGES : pages);

  useEffect(() => {
    setOverrides({});
    setResult(null);
    setError(null);
  }, [file]);
  useEffect(() => () => {
    if (outUrl.current) URL.revokeObjectURL(outUrl.current);
  }, []);

  const willRemove = (i: number) => overrides[i] ?? blank[i] ?? false;
  function toggle(i: number) {
    setResult(null);
    setOverrides((o) => ({ ...o, [i]: !willRemove(i) }));
  }

  const removeCount = useMemo(
    () => Array.from({ length: pageCount }, (_, i) => i).filter(willRemove).length,
    [pageCount, overrides, blank],
  );
  const detectedCount = Object.values(blank).filter(Boolean).length;
  const keepCount = pageCount - removeCount;

  async function run() {
    if (!file || removeCount === 0 || keepCount === 0) return;
    setBusy(true);
    setError(null);
    try {
      const keep = Array.from({ length: pageCount }, (_, i) => i).filter((i) => !willRemove(i));
      const bytes = await extractPages(file, keep);
      const blob = bytesToBlob(bytes, 'application/pdf');
      outUrl.current = URL.createObjectURL(blob);
      setResult({ blob, bytes: bytes.byteLength });
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

  return (
    <ToolShell
      title="Remove blank pages"
      blurb="Finds pages that look empty so you can review them, then removes the ones you keep checked."
    >
      {(error || loadError) && <Notice tone="error">{error ?? loadError}</Notice>}

      {!file && (
        <FileDrop accept="application/pdf,.pdf" hint="One PDF" onFiles={(f) => setFile(f[0] ?? null)} />
      )}

      {file && result && (
        <DownloadCard
          headline={`${removeCount} page${removeCount > 1 ? 's' : ''} removed`}
          detail={`${keepCount} page${keepCount === 1 ? '' : 's'} kept · ${formatBytes(result.bytes)}`}
          filename={`${base}-no-blanks.pdf`}
          blob={result.blob}
          onReset={reset}
        />
      )}

      {file && !result && (
        <div className="space-y-4">
          <FileRow file={file} onClear={reset} />

          {loading && pages.length === 0 && <ProgressBar ratio={null} label="Opening PDF…" />}

          {pageCount > 0 && (
            <>
              <p className="text-sm text-ink-500 dark:text-white/60">
                {analyzing ? (
                  `Scanning for blank pages… ${Object.keys(blank).length}/${pageCount}`
                ) : (
                  <>
                    {detectedCount} of {pageCount} page{pageCount === 1 ? '' : 's'} look blank
                  </>
                )}
                {' · '}
                <span className="font-medium text-ink-900 dark:text-white">
                  {removeCount} selected to remove
                </span>
              </p>

              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {pages.map((page) => {
                  const remove = willRemove(page.index);
                  const isBlank = blank[page.index];
                  return (
                    <li key={page.index}>
                      <button
                        type="button"
                        onClick={() => toggle(page.index)}
                        aria-pressed={remove}
                        aria-label={`Page ${page.index + 1}${remove ? ', marked for removal' : ''}`}
                        className={`relative block w-full overflow-hidden rounded-lg border-2 transition-colors ${
                          remove
                            ? 'border-red-400 ring-2 ring-red-400/30'
                            : 'border-paper-200 hover:border-brand-300 dark:border-white/15'
                        }`}
                      >
                        <span
                          className={`block aspect-3/4 bg-white transition-opacity dark:bg-white/5 ${
                            remove ? 'opacity-45' : ''
                          }`}
                        >
                          {page.url ? (
                            <img src={page.url} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <span className="grid h-full place-items-center text-xs text-ink-500">…</span>
                          )}
                        </span>
                        <span className="absolute left-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black/60 px-1 text-[10px] font-semibold text-white">
                          {page.index + 1}
                        </span>
                        {isBlank && (
                          <span className="absolute right-1 top-1 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            Blank
                          </span>
                        )}
                        <span
                          className={`absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                            remove
                              ? 'bg-red-500 text-white'
                              : 'bg-white/85 text-ink-500 dark:bg-black/40 dark:text-white/70'
                          }`}
                        >
                          {remove ? '✕' : '✓'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="text-xs text-ink-500 dark:text-white/50">
                Tap a page to change whether it&rsquo;s removed. Everything shown here is a suggestion
                until you export.
              </p>

              {busy ? (
                <ProgressBar ratio={null} label="Building PDF…" />
              ) : (
                <button
                  type="button"
                  onClick={run}
                  disabled={removeCount === 0 || keepCount === 0}
                  className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {removeCount === 0
                    ? 'No pages selected'
                    : keepCount === 0
                      ? "Can't remove every page"
                      : `Remove ${removeCount} page${removeCount > 1 ? 's' : ''}`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </ToolShell>
  );
}
