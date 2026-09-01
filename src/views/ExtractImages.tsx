import { useEffect, useRef, useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { SaveAs } from '../components/SaveAs';
import { FileRow } from './AddPageNumbers';
import { extractImages, type ExtractedImage } from '../lib/extractImages';
import { zipFiles } from '../lib/zip';
import { downloadBlob } from '../lib/download';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';

interface Row extends ExtractedImage {
  url: string;
  bytes: number;
}

export function ExtractImages() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<Row[] | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const extracted = await extractImages(file);
      const rows: Row[] = extracted.map((im) => {
        const url = URL.createObjectURL(im.blob);
        urls.current.push(url);
        return { ...im, url, bytes: im.blob.size };
      });
      setImages(rows);
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
    setImages(null);
    setError(null);
  }

  async function downloadAll() {
    if (!images?.length) return;
    const zip = await zipFiles(images.map((r) => ({ name: r.name, data: r.blob })));
    downloadBlob(zip, `${base}-images.zip`);
  }

  const base = file?.name.replace(/\.pdf$/i, '') ?? 'document';
  const totalBytes = (images ?? []).reduce((s, r) => s + r.bytes, 0);

  return (
    <ToolShell
      title="Extract images"
      blurb="Pull every embedded photo out of a PDF. JPEGs come out at their original quality."
    >
      {error && <Notice tone="error">{error}</Notice>}

      {!file && (
        <FileDrop accept="application/pdf,.pdf" hint="One PDF" onFiles={(f) => setFile(f[0] ?? null)} />
      )}

      {file && !images && (
        <div className="space-y-4">
          <FileRow file={file} onClear={reset} />
          {busy ? (
            <ProgressBar ratio={null} label="Scanning pages for images…" />
          ) : (
            <button
              type="button"
              onClick={run}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
            >
              Extract images
            </button>
          )}
        </div>
      )}

      {images && images.length === 0 && (
        <Notice tone="info">
          No embedded images found in this PDF. Pages that are pure text, or drawn as vector
          graphics, have nothing to pull out — try <strong>PDF to image</strong> to render whole
          pages instead.
          <button type="button" onClick={reset} className="mt-2 block font-medium underline">
            Try another file
          </button>
        </Notice>
      )}

      {images && images.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
            <div>
              <p className="text-xl font-bold text-brand-800 dark:text-brand-200">
                {images.length} image{images.length > 1 ? 's' : ''} found
              </p>
              <p className="mt-1 text-sm text-ink-500 dark:text-white/60">
                {formatBytes(totalBytes)} total
              </p>
            </div>
            {images.length === 1 ? (
              <SaveAs blob={images[0].blob} defaultName={images[0].name} />
            ) : (
              <button
                type="button"
                onClick={downloadAll}
                className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
              >
                Download all (.zip)
              </button>
            )}
          </div>

          {images.length > 1 && (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((row, i) => (
                <li key={i} className="space-y-1">
                  <a
                    href={row.url}
                    download={row.name}
                    className="block overflow-hidden rounded-lg border border-paper-200 bg-white dark:border-white/10 dark:bg-white/5"
                  >
                    <img src={row.url} alt={row.name} className="aspect-square w-full object-cover" />
                  </a>
                  <p className="truncate text-[11px] text-ink-500 dark:text-white/50">
                    {row.name} · {formatBytes(row.bytes)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-paper-200 px-4 py-2.5 font-semibold text-ink-700 dark:border-white/15 dark:text-white/80"
          >
            Extract from another PDF
          </button>
        </div>
      )}
    </ToolShell>
  );
}
