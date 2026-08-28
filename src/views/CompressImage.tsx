import { useEffect, useRef, useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { compressImage, type ImageQuality } from '../lib/image';
import { zipFiles } from '../lib/zip';
import { downloadBlob } from '../lib/download';
import { formatBytes, percentSmaller } from '../lib/format';
import { errorMessage } from '../lib/errors';

const isImage = (f: File) =>
  /^image\/(jpeg|png|webp)$/.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name);

const QUALITIES: { id: ImageQuality; label: string; blurb: string }[] = [
  { id: 'high', label: 'High', blurb: 'Light touch — keeps most detail.' },
  { id: 'medium', label: 'Medium', blurb: 'Balanced size and quality.' },
  { id: 'low', label: 'Small', blurb: 'Smallest files, softer detail.' },
];

interface Row {
  name: string;
  inputBytes: number;
  outputBytes: number;
  blob: Blob;
  url: string;
}

export function CompressImage() {
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState<ImageQuality>('medium');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function add(incoming: File[]) {
    const imgs = incoming.filter(isImage);
    setError(imgs.length < incoming.length ? 'Skipped files that are not JPG, PNG, or WebP.' : null);
    setFiles((prev) => [...prev, ...imgs]);
    setRows(null);
  }

  async function run() {
    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: files.length });
    const out: Row[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ done: i, total: files.length });
        const res = await compressImage(file, quality);
        const url = URL.createObjectURL(res.blob);
        urls.current.push(url);
        out.push({
          name: renamed(file.name, res.outputType),
          inputBytes: file.size,
          outputBytes: res.outputBytes,
          blob: res.blob,
          url,
        });
      }
      setRows(out);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
    setFiles([]);
    setRows(null);
    setError(null);
  }

  async function downloadAll() {
    if (!rows) return;
    if (rows.length === 1) return downloadBlob(rows[0].blob, rows[0].name);
    const zip = await zipFiles(rows.map((r) => ({ name: r.name, data: r.blob })));
    downloadBlob(zip, 'compressed-images.zip');
  }

  const inTotal = (rows ?? []).reduce((s, r) => s + r.inputBytes, 0);
  const outTotal = (rows ?? []).reduce((s, r) => s + r.outputBytes, 0);

  return (
    <ToolShell title="Compress image" blurb="Shrink JPG, PNG, or WebP files. Pick several at once.">
      {error && <Notice tone="warn">{error}</Notice>}

      {rows ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
            <p className="text-xl font-bold text-brand-800 dark:text-brand-200">
              {percentSmaller(inTotal, outTotal)}% smaller
            </p>
            <p className="mt-1 text-sm text-ink-500 dark:text-white/60">
              {formatBytes(inTotal)} → {formatBytes(outTotal)} total
            </p>
            <button
              type="button"
              onClick={downloadAll}
              className="mt-4 rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
            >
              {rows.length > 1 ? 'Download all (.zip)' : 'Download'}
            </button>
          </div>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-paper-200 bg-white p-3 dark:border-white/10 dark:bg-white/5"
              >
                <img src={r.url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900 dark:text-white">{r.name}</p>
                  <p className="text-sm text-ink-500 dark:text-white/60">
                    {formatBytes(r.inputBytes)} → {formatBytes(r.outputBytes)} ·{' '}
                    {percentSmaller(r.inputBytes, r.outputBytes)}%
                  </p>
                </div>
                <a href={r.url} download={r.name} className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                  Save
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-paper-200 px-4 py-2.5 font-semibold text-ink-700 dark:border-white/15 dark:text-white/80"
          >
            Compress more
          </button>
        </div>
      ) : (
        <>
          <FileDrop
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            multiple
            hint="JPG, PNG, or WebP"
            onFiles={add}
          />
          {files.length > 0 && (
            <>
              <p className="text-sm text-ink-500 dark:text-white/60">
                {files.length} image{files.length > 1 ? 's' : ''} ·{' '}
                {formatBytes(files.reduce((s, f) => s + f.size, 0))}
                <button type="button" onClick={reset} className="ml-3 font-medium text-brand-700 dark:text-brand-300">
                  Clear
                </button>
              </p>
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-ink-700 dark:text-white/80">Quality</legend>
                <div className="flex flex-wrap gap-2">
                  {QUALITIES.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setQuality(q.id)}
                      title={q.blurb}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                        quality === q.id
                          ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                          : 'border-paper-200 dark:border-white/15'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink-500 dark:text-white/50">
                  {QUALITIES.find((q) => q.id === quality)?.blurb}
                </p>
              </fieldset>
              {busy ? (
                <ProgressBar
                  ratio={progress.total ? progress.done / progress.total : null}
                  label={`Compressing ${progress.done + 1} of ${progress.total}…`}
                />
              ) : (
                <button
                  type="button"
                  onClick={run}
                  className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
                >
                  Compress {files.length > 1 ? `${files.length} images` : 'image'}
                </button>
              )}
            </>
          )}
        </>
      )}
    </ToolShell>
  );
}

function renamed(name: string, type: string): string {
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  return name.replace(/\.[^.]+$/, '') + `-min.${ext}`;
}
