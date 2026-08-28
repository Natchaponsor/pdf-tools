import { useEffect, useRef, useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { DownloadCard } from '../components/DownloadCard';
import { ProgressBar } from '../components/ProgressBar';
import { imagesToPdf, type ImagesToPdfOptions } from '../lib/pdf';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';
import { bytesToBlob } from '../lib/download';

interface Item {
  file: File;
  key: string;
  url: string;
}

const isImage = (f: File) => /^image\/(jpeg|png)$/.test(f.type) || /\.(jpe?g|png)$/i.test(f.name);

export function ImagesToPdf() {
  const [items, setItems] = useState<Item[]>([]);
  const [pageSize, setPageSize] = useState<ImagesToPdfOptions['pageSize']>('fit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; bytes: number } | null>(null);
  const outUrl = useRef<string | null>(null);

  useEffect(
    () => () => {
      items.forEach((it) => URL.revokeObjectURL(it.url));
      if (outUrl.current) URL.revokeObjectURL(outUrl.current);
    },
    [items],
  );

  function add(files: File[]) {
    const imgs = files.filter(isImage);
    setError(imgs.length < files.length ? 'Skipped files that are not JPG or PNG.' : null);
    setItems((prev) => [
      ...prev,
      ...imgs.map((file) => ({
        file,
        key: `${file.name}:${file.size}:${Math.random()}`,
        url: URL.createObjectURL(file),
      })),
    ]);
    setResult(null);
  }

  function move(index: number, delta: number) {
    setItems((prev) => {
      const next = [...prev];
      const t = index + delta;
      if (t < 0 || t >= next.length) return prev;
      [next[index], next[t]] = [next[t], next[index]];
      return next;
    });
    setResult(null);
  }

  function remove(key: string) {
    setItems((prev) => {
      const gone = prev.find((it) => it.key === key);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((it) => it.key !== key);
    });
    setResult(null);
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const bytes = await imagesToPdf(items.map((it) => it.file), {
        pageSize,
        margin: 36,
      });
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
    items.forEach((it) => URL.revokeObjectURL(it.url));
    if (outUrl.current) URL.revokeObjectURL(outUrl.current);
    outUrl.current = null;
    setItems([]);
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell title="Images to PDF" blurb="Combine JPG and PNG images into a single PDF, one image per page.">
      {error && <Notice tone="warn">{error}</Notice>}

      {result ? (
        <DownloadCard
          headline="PDF created"
          detail={`${items.length} images · ${formatBytes(result.bytes)}`}
          filename="images.pdf"
          blob={result.blob}
          onReset={reset}
        />
      ) : (
        <>
          <FileDrop accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple hint="JPG or PNG images" onFiles={add} />

          {items.length > 0 && (
            <>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {items.map((it, i) => (
                  <li key={it.key} className="group relative">
                    <img
                      src={it.url}
                      alt={it.file.name}
                      className="aspect-3/4 w-full rounded-lg border border-paper-200 object-cover dark:border-white/10"
                    />
                    <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[10px] font-semibold text-white">
                      {i + 1}
                    </span>
                    <div className="mt-1 flex justify-center gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="rounded px-1.5 text-ink-500 disabled:opacity-30"
                        aria-label="Move left"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(it.key)}
                        className="rounded px-1.5 text-ink-500"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === items.length - 1}
                        className="rounded px-1.5 text-ink-500 disabled:opacity-30"
                        aria-label="Move right"
                      >
                        →
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-ink-700 dark:text-white/80">
                  Page size
                </legend>
                <div className="flex flex-wrap gap-2">
                  {(['fit', 'a4', 'letter'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPageSize(size)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium capitalize ${
                        pageSize === size
                          ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                          : 'border-paper-200 dark:border-white/15'
                      }`}
                    >
                      {size === 'fit' ? 'Fit to image' : size.toUpperCase()}
                    </button>
                  ))}
                </div>
              </fieldset>

              {busy ? (
                <ProgressBar ratio={null} label="Building PDF…" />
              ) : (
                <button
                  type="button"
                  onClick={run}
                  className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
                >
                  Create PDF
                </button>
              )}
            </>
          )}
        </>
      )}
    </ToolShell>
  );
}
