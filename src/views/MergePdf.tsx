import { useEffect, useRef, useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { DownloadCard } from '../components/DownloadCard';
import { WorkingCard } from '../components/WorkingCard';
import { FilePickerButton } from '../components/FilePickerButton';
import { mergePdfs } from '../lib/pdf';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';
import { bytesToBlob } from '../lib/download';
import { takeHandoff } from '../lib/handoff';

interface Item {
  file: File;
  key: string;
}

const keyFor = (f: File) => `${f.name}:${f.size}:${f.lastModified}:${Math.random()}`;
const isPdf = (f: File) =>
  f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

export function MergePdf() {
  const [items, setItems] = useState<Item[]>(() => {
    const handoff = takeHandoff();
    return handoff ? [{ file: handoff, key: keyFor(handoff) }] : [];
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; bytes: number } | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  function add(files: File[]) {
    const pdfs = files.filter(isPdf);
    setError(pdfs.length < files.length ? 'Skipped files that are not PDFs.' : null);
    setItems((prev) => [...prev, ...pdfs.map((file) => ({ file, key: keyFor(file) }))]);
    setResult(null);
  }

  function move(index: number, delta: number) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setResult(null);
  }

  function remove(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
    setResult(null);
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const bytes = await mergePdfs(items.map((it) => it.file));
      const blob = bytesToBlob(bytes, 'application/pdf');
      urlRef.current = URL.createObjectURL(blob);
      setResult({ blob, bytes: bytes.byteLength });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setItems([]);
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell title="Merge PDFs" blurb="Combine several PDFs into one. Set the order, then export.">
      {error && <Notice tone="warn">{error}</Notice>}

      {result ? (
        <DownloadCard
          headline="Merged"
          detail={`${items.length} files → one PDF · ${formatBytes(result.bytes)}`}
          filename="merged.pdf"
          blob={result.blob}
          onReset={reset}
          chainFrom="merge"
        />
      ) : (
        <>
          {items.length === 0 ? (
            <FileDrop
              accept="application/pdf,.pdf"
              multiple
              hint="Two or more PDFs"
              onFiles={add}
            />
          ) : (
            <div className="animate-enter space-y-3">
              <ol className="divide-y divide-paper-200 overflow-hidden rounded-2xl border border-paper-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
                {items.map((it, i) => (
                  <li key={it.key} className="flex items-center gap-3 p-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper-100 text-xs font-semibold text-ink-500 dark:bg-white/10">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink-900 dark:text-white">
                        {it.file.name}
                      </p>
                      <p className="text-sm text-ink-500 dark:text-white/60">
                        {formatBytes(it.file.size)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0 || busy}
                        aria-label="Move up"
                        className="rounded-md px-2 py-1 text-ink-dim transition-colors hover:bg-ink-dim hover:text-page disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-dim"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === items.length - 1 || busy}
                        aria-label="Move down"
                        className="rounded-md px-2 py-1 text-ink-dim transition-colors hover:bg-ink-dim hover:text-page disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-dim"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(it.key)}
                        disabled={busy}
                        aria-label={`Remove ${it.file.name}`}
                        className="rounded-md px-2 py-1 text-sm text-ink-dim transition-colors hover:bg-ink-dim hover:text-page"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500 dark:text-white/60">
                  {items.length} file{items.length === 1 ? '' : 's'} ·{' '}
                  {formatBytes(items.reduce((sum, it) => sum + it.file.size, 0))}
                </span>
                {!busy && (
                  <div className="flex gap-3">
                    <FilePickerButton onFiles={add} />
                    <button
                      type="button"
                      onClick={reset}
                      className="font-medium text-ink-500 hover:text-ink-900 dark:hover:text-white"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {busy && <WorkingCard ratio={null} label="Merging…" />}

          {items.length >= 2 && !busy && (
            <button
              type="button"
              onClick={run}
              className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white shadow-sm transition-[transform,background-color] duration-150 hover:bg-brand-700 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Merge {items.length} PDFs
            </button>
          )}
        </>
      )}
    </ToolShell>
  );
}
