import { useEffect, useMemo, useRef, useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { DownloadCard } from '../components/DownloadCard';
import { FileRow } from './AddPageNumbers';
import { usePageThumbnails } from '../lib/usePageThumbnails';
import { organizePages, type PageOp, type RotationAngle } from '../lib/pdf';
import { bytesToBlob } from '../lib/download';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';

const norm = (deg: number): RotationAngle => ((((deg % 360) + 360) % 360) as RotationAngle);

export function RotatePdf() {
  const [file, setFile] = useState<File | null>(null);
  const [rotations, setRotations] = useState<Record<number, RotationAngle>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; bytes: number } | null>(null);
  const outUrl = useRef<string | null>(null);

  const { pages, pageCount, loading, error: loadError } = usePageThumbnails(file);

  useEffect(() => {
    setRotations({});
    setResult(null);
    setError(null);
  }, [file]);
  useEffect(() => () => {
    if (outUrl.current) URL.revokeObjectURL(outUrl.current);
  }, []);

  const rot = (i: number) => rotations[i] ?? 0;

  function rotateOne(i: number) {
    setResult(null);
    setRotations((r) => ({ ...r, [i]: norm((r[i] ?? 0) + 90) }));
  }

  function rotateAll(delta: number) {
    setResult(null);
    setRotations((r) => {
      const next: Record<number, RotationAngle> = {};
      for (let i = 0; i < pageCount; i++) next[i] = norm((r[i] ?? 0) + delta);
      return next;
    });
  }

  const dirty = useMemo(
    () => Object.values(rotations).some((v) => v !== 0),
    [rotations],
  );

  async function run() {
    if (!file || !dirty) return;
    setBusy(true);
    setError(null);
    try {
      const ops: PageOp[] = Array.from({ length: pageCount }, (_, i) => ({
        index: i,
        rotate: rot(i),
      }));
      const bytes = await organizePages(file, ops);
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
      title="Rotate PDF"
      blurb="Rotate individual pages, or spin the whole document at once, then export."
    >
      {(error || loadError) && <Notice tone="error">{error ?? loadError}</Notice>}

      {!file && (
        <FileDrop accept="application/pdf,.pdf" hint="One PDF" onFiles={(f) => setFile(f[0] ?? null)} />
      )}

      {file && result && (
        <DownloadCard
          headline="Pages rotated"
          detail={`${pageCount} pages · ${formatBytes(result.bytes)}`}
          filename={`${base}-rotated.pdf`}
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => rotateAll(-90)}
                  className="rounded-lg border border-paper-200 px-3 py-1.5 text-sm font-medium hover:bg-paper-100 dark:border-white/15 dark:hover:bg-white/10"
                >
                  ⟲ Rotate all left
                </button>
                <button
                  type="button"
                  onClick={() => rotateAll(90)}
                  className="rounded-lg border border-paper-200 px-3 py-1.5 text-sm font-medium hover:bg-paper-100 dark:border-white/15 dark:hover:bg-white/10"
                >
                  ⟳ Rotate all right
                </button>
                {dirty && (
                  <button
                    type="button"
                    onClick={() => setRotations({})}
                    className="text-sm font-medium text-ink-500 hover:text-ink-900 dark:hover:text-white"
                  >
                    Reset
                  </button>
                )}
              </div>

              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {pages.map((page) => (
                  <li key={page.index}>
                    <button
                      type="button"
                      onClick={() => rotateOne(page.index)}
                      aria-label={`Rotate page ${page.index + 1}`}
                      className="group relative block w-full overflow-hidden rounded-lg border border-paper-200 bg-white transition-colors hover:border-brand-400 dark:border-white/15 dark:bg-white/5"
                    >
                      <span className="grid aspect-3/4 place-items-center overflow-hidden">
                        {page.url ? (
                          <img
                            src={page.url}
                            alt=""
                            className="h-full w-full object-contain transition-transform duration-200"
                            style={{ transform: `rotate(${rot(page.index)}deg)` }}
                          />
                        ) : (
                          <span className="text-xs text-ink-500">…</span>
                        )}
                      </span>
                      <span className="absolute left-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black/60 px-1 text-[10px] font-semibold text-white">
                        {page.index + 1}
                      </span>
                      <span className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-white/85 text-ink-700 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-black/50 dark:text-white">
                        ⟳
                      </span>
                      {rot(page.index) !== 0 && (
                        <span className="absolute bottom-1 left-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {rot(page.index)}°
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              {loading && pages.length > 0 && (
                <p className="text-xs text-ink-500 dark:text-white/50">
                  Loading previews… {pages.length}/{pageCount}
                </p>
              )}

              {busy ? (
                <ProgressBar ratio={null} label="Building PDF…" />
              ) : (
                <button
                  type="button"
                  onClick={run}
                  disabled={!dirty}
                  className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {dirty ? 'Export rotated PDF' : 'Tap a page to rotate it'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </ToolShell>
  );
}
