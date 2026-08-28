import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../components/FileDrop';
import { ProgressBar } from '../components/ProgressBar';
import { Notice } from '../components/Notice';
import { MAX_COMPRESS_BYTES } from '../lib/constants';
import { formatBytes, formatDuration, percentSmaller } from '../lib/format';
import {
  COMPRESS_LEVELS,
  compressPdf,
  renderFirstPage,
  type CompressLevel,
  type CompressProgress,
} from '../lib/compress';
import { downloadBlob } from '../lib/download';

interface Item {
  file: File;
  key: string;
}

interface ResultRow {
  name: string;
  inputBytes: number;
  outputBytes?: number;
  ms?: number;
  blob?: Blob;
  url?: string;
  thumbUrl?: string;
  error?: string;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'working'; done: number; total: number; current: string; progress: CompressProgress }
  | { kind: 'results'; rows: ResultRow[] };

const keyFor = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;
const isPdf = (f: File) =>
  f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
const outName = (name: string) => name.replace(/\.pdf$/i, '') + '-compressed.pdf';

export function CompressPdf() {
  const [items, setItems] = useState<Item[]>([]);
  const [level, setLevel] = useState<CompressLevel>('balanced');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [notice, setNotice] = useState<string | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const totalBytes = items.reduce((sum, it) => sum + it.file.size, 0);
  const oversized = totalBytes > MAX_COMPRESS_BYTES;
  const working = phase.kind === 'working';

  function track(url: string) {
    urls.current.push(url);
    return url;
  }

  function addFiles(incoming: File[]) {
    const pdfs = incoming.filter(isPdf);
    const rejected = incoming.length - pdfs.length;
    setNotice(
      rejected > 0
        ? `Skipped ${rejected} file${rejected > 1 ? 's' : ''} that ${
            rejected > 1 ? "aren't" : "isn't"
          } a PDF.`
        : null,
    );
    setItems((prev) => {
      const seen = new Set(prev.map((it) => it.key));
      const next = [...prev];
      for (const f of pdfs) {
        const key = keyFor(f);
        if (!seen.has(key)) {
          seen.add(key);
          next.push({ file: f, key });
        }
      }
      return next;
    });
    setPhase({ kind: 'idle' });
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
    setPhase({ kind: 'idle' });
  }

  function resetAll() {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
    setItems([]);
    setNotice(null);
    setPhase({ kind: 'idle' });
  }

  async function run() {
    if (!items.length || oversized) return;
    const rows: ResultRow[] = [];
    for (let i = 0; i < items.length; i++) {
      const file = items[i].file;
      setPhase({
        kind: 'working',
        done: i,
        total: items.length,
        current: file.name,
        progress: { ratio: null, note: 'Starting…' },
      });
      try {
        const outcome = await compressPdf(file, level, (progress) =>
          setPhase({ kind: 'working', done: i, total: items.length, current: file.name, progress }),
        );
        let thumbUrl: string | undefined;
        try {
          const preview = await renderFirstPage(outcome.blob);
          thumbUrl = track(URL.createObjectURL(preview.blob));
        } catch {
          // Preview is a nicety — a failure here shouldn't lose the result.
        }
        rows.push({
          name: outName(file.name),
          inputBytes: file.size,
          outputBytes: outcome.outputBytes,
          ms: outcome.ms,
          blob: outcome.blob,
          url: track(URL.createObjectURL(outcome.blob)),
          thumbUrl,
        });
      } catch (err) {
        rows.push({ name: file.name, inputBytes: file.size, error: friendlyError(err) });
      }
    }
    setPhase({ kind: 'results', rows });
  }

  async function downloadAll(rows: ResultRow[]) {
    const done = rows.filter((r) => r.blob);
    if (done.length === 1) {
      downloadBlob(done[0].blob!, done[0].name);
      return;
    }
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const used = new Set<string>();
    for (const r of done) {
      let name = r.name;
      for (let n = 2; used.has(name); n++) name = r.name.replace(/\.pdf$/i, `-${n}.pdf`);
      used.add(name);
      zip.file(name, r.blob!);
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), 'compressed-pdfs.zip');
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Compress PDF</h1>
        <p className="text-sm text-ink-500 dark:text-white/60">
          Shrink one or several PDFs for email or upload. Combined size up to{' '}
          {formatBytes(MAX_COMPRESS_BYTES)}.
        </p>
      </header>

      {notice && <Notice tone="warn">{notice}</Notice>}

      {phase.kind !== 'results' && (
        <>
          {items.length === 0 ? (
            <FileDrop
              accept="application/pdf,.pdf"
              multiple
              hint={`PDFs totalling up to ${formatBytes(MAX_COMPRESS_BYTES)}`}
              onFiles={addFiles}
            />
          ) : (
            <div className="space-y-3">
              <ul className="divide-y divide-paper-200 overflow-hidden rounded-2xl border border-paper-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
                {items.map((it) => (
                  <li key={it.key} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900 dark:text-white">
                        {it.file.name}
                      </p>
                      <p className="text-sm text-ink-500 dark:text-white/60">
                        {formatBytes(it.file.size)}
                      </p>
                    </div>
                    {!working && (
                      <button
                        type="button"
                        onClick={() => removeItem(it.key)}
                        aria-label={`Remove ${it.file.name}`}
                        className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-500 hover:bg-paper-100 hover:text-ink-900 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between text-sm">
                <span className={oversized ? 'font-medium text-red-600 dark:text-red-400' : 'text-ink-500 dark:text-white/60'}>
                  Total {formatBytes(totalBytes)} / {formatBytes(MAX_COMPRESS_BYTES)}
                </span>
                {!working && (
                  <div className="flex gap-3">
                    <FilePickerButton onFiles={addFiles} />
                    <button
                      type="button"
                      onClick={resetAll}
                      className="font-medium text-ink-500 hover:text-ink-900 dark:hover:text-white"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {oversized && (
            <Notice tone="warn">
              These files total {formatBytes(totalBytes)}, over the{' '}
              {formatBytes(MAX_COMPRESS_BYTES)} limit. Remove one or more to continue.
            </Notice>
          )}

          {items.length > 0 && !working && (
            <fieldset className="space-y-3">
              <legend className="mb-1 text-sm font-semibold text-ink-700 dark:text-white/80">
                Quality level
              </legend>
              {COMPRESS_LEVELS.map((info) => (
                <label
                  key={info.id}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
                    level === info.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                      : 'border-paper-200 bg-white hover:border-brand-300 dark:border-white/10 dark:bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="level"
                    value={info.id}
                    checked={level === info.id}
                    onChange={() => setLevel(info.id)}
                    className="mt-1 accent-brand-600"
                  />
                  <span>
                    <span className="block font-medium text-ink-900 dark:text-white">
                      {info.label}
                    </span>
                    <span className="block text-sm text-ink-500 dark:text-white/60">
                      {info.blurb}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {items.length > 0 && !working && (
            <button
              type="button"
              onClick={run}
              disabled={oversized}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {items.length === 1 ? 'Compress PDF' : `Compress ${items.length} PDFs`}
            </button>
          )}

          {phase.kind === 'working' && (
            <div className="space-y-3 rounded-2xl border border-paper-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              {phase.total > 1 && (
                <p className="text-sm font-medium text-ink-700 dark:text-white/80">
                  File {phase.done + 1} of {phase.total}: {phase.current}
                </p>
              )}
              <ProgressBar ratio={phase.progress.ratio} label={phase.progress.note} />
              <p className="text-xs text-ink-500 dark:text-white/50">
                Large scans can take a minute each. Everything runs in this tab.
              </p>
            </div>
          )}
        </>
      )}

      {phase.kind === 'results' && (
        <Results rows={phase.rows} onReset={resetAll} onDownloadAll={() => downloadAll(phase.rows)} />
      )}
    </div>
  );
}

function Results({
  rows,
  onReset,
  onDownloadAll,
}: {
  rows: ResultRow[];
  onReset: () => void;
  onDownloadAll: () => void;
}) {
  const ok = rows.filter((r) => r.blob);
  const inTotal = rows.reduce((s, r) => s + r.inputBytes, 0);
  const outTotal = ok.reduce((s, r) => s + (r.outputBytes ?? 0), 0);
  const overallPct = percentSmaller(
    ok.reduce((s, r) => s + r.inputBytes, 0),
    outTotal,
  );

  return (
    <div className="space-y-4">
      {ok.length > 0 && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
          <p className="text-xl font-bold text-brand-800 dark:text-brand-200">
            {rows.length > 1 ? `${ok.length} of ${rows.length} PDFs compressed` : null}
            {rows.length > 1 ? ' · ' : ''}
            {overallPct > 0 ? `${overallPct}% smaller` : 'Already tightly packed'}
          </p>
          <p className="mt-1 text-sm text-ink-500 dark:text-white/60">
            {formatBytes(inTotal)} → {formatBytes(outTotal)} total
          </p>
          <button
            type="button"
            onClick={onDownloadAll}
            className="mt-4 rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
          >
            {ok.length > 1 ? 'Download all (.zip)' : 'Download'}
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-2xl border border-paper-200 bg-white p-3 dark:border-white/10 dark:bg-white/5"
          >
            <div className="grid h-24 w-[72px] shrink-0 place-items-center overflow-hidden rounded-lg border border-paper-200 bg-paper-50 dark:border-white/10 dark:bg-white/10">
              {r.thumbUrl ? (
                <img
                  src={r.thumbUrl}
                  alt={`First page of ${r.name}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-[10px] text-ink-500">no preview</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink-900 dark:text-white">{r.name}</p>
              {r.error ? (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{r.error}</p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-ink-500 dark:text-white/60">
                    {formatBytes(r.inputBytes)} → {formatBytes(r.outputBytes ?? 0)} ·{' '}
                    {percentSmaller(r.inputBytes, r.outputBytes ?? r.inputBytes)}% smaller
                    {r.ms != null ? ` · ${formatDuration(r.ms)}` : ''}
                  </p>
                  {r.url && (
                    <a
                      href={r.url}
                      download={r.name}
                      className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
                    >
                      Download
                    </a>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onReset}
        className="rounded-xl border border-paper-200 px-4 py-2.5 font-semibold text-ink-700 hover:bg-white dark:border-white/15 dark:text-white/80 dark:hover:bg-white/10"
      >
        Compress more
      </button>
    </div>
  );
}

function FilePickerButton({ onFiles }: { onFiles: (files: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        Add files
      </button>
      <input
        ref={ref}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />
    </>
  );
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/password|encrypt|decrypt/i.test(message)) {
    return 'This PDF is password-protected. Remove the password in your PDF viewer, then try again.';
  }
  if (/load|fetch|wasm|network/i.test(message)) {
    return 'The compression engine could not load. Check your connection and reload the page.';
  }
  if (/damaged|repair|corrupt|not a PDF|trailer|xref/i.test(message)) {
    return 'This PDF looks damaged and could not be read. Try re-saving it from the source.';
  }
  return `Compression failed: ${message}`;
}
