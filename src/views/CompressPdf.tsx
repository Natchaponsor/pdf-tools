import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { MAX_COMPRESS_BYTES } from '../lib/constants';
import { formatBytes, formatDuration, percentSmaller } from '../lib/format';
import {
  COMPRESS_LEVELS,
  compressPdf,
  type CompressLevel,
  type CompressProgress,
} from '../lib/compress';
import { renderFirstPage } from '../lib/pdfDoc';
import { downloadBlob } from '../lib/download';
import { SaveAs } from '../components/SaveAs';
import { WorkingCard } from '../components/WorkingCard';
import { FilePickerButton } from '../components/FilePickerButton';
import { ToolHeader } from '../components/ToolShell';
import { Pal } from '../components/Pal';
import { takeHandoff } from '../lib/handoff';

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
  const [items, setItems] = useState<Item[]>(() => {
    const handoff = takeHandoff();
    return handoff ? [{ file: handoff, key: keyFor(handoff) }] : [];
  });
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
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Compress PDF"
        blurb={`Shrink one or several PDFs for email or upload. Combined size up to ${formatBytes(
          MAX_COMPRESS_BYTES,
        )}.`}
      />

      {notice && <Notice tone="warn">{notice}</Notice>}

      {phase.kind !== 'results' && (
        <>
          {items.length === 0 ? (
            <FileDrop
              accept="application/pdf,.pdf"
              multiple
              label="Drop PDFs here"
              hint={`PDFs totalling up to ${formatBytes(MAX_COMPRESS_BYTES)}`}
              onFiles={addFiles}
            />
          ) : (
            <div className="animate-enter rounded-[20px] bg-recess p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3 pb-3">
                <p className="text-[14px] font-bold text-ink">
                  {items.length} {items.length === 1 ? 'file' : 'files'} ready
                </p>
                <p className={`num text-[13px] ${oversized ? 'font-bold text-danger' : 'text-ink-dim'}`}>
                  {formatBytes(totalBytes)} / {formatBytes(MAX_COMPRESS_BYTES)}
                </p>
              </div>

              <ul className="space-y-2">
                {items.map((it) => (
                  <li
                    key={it.key}
                    className="flex items-center justify-between gap-3 rounded-[14px] bg-page p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15.5px] font-bold leading-tight text-ink">
                        {it.file.name}
                      </p>
                      <p className="num mt-0.5 text-[12.5px] text-ink-dim">{formatBytes(it.file.size)}</p>
                    </div>
                    {!working && (
                      <button
                        type="button"
                        onClick={() => removeItem(it.key)}
                        aria-label={`Remove ${it.file.name}`}
                        className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold text-ink-dim transition-colors hover:bg-sunk hover:text-danger"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {!working && (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <FilePickerButton onFiles={addFiles} />
                  <button
                    type="button"
                    onClick={resetAll}
                    className="text-[13.5px] font-bold text-ink-dim transition-colors hover:text-ink"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}

          {oversized && (
            <Notice tone="warn">
              These files total {formatBytes(totalBytes)}, over the{' '}
              {formatBytes(MAX_COMPRESS_BYTES)} limit. Remove one or more to continue.
            </Notice>
          )}

          {items.length > 0 && !working && (
            <fieldset>
              <legend className="text-[15px] font-extrabold tracking-tight text-ink">
                How small do you need it?
              </legend>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                {COMPRESS_LEVELS.map((info) => {
                  const on = level === info.id;
                  return (
                    <label
                      key={info.id}
                      className={`cursor-pointer rounded-[20px] border-2 p-4 transition-[transform,border-color,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        on
                          ? 'border-brand bg-chip'
                          : 'border-line bg-page hover:-translate-y-0.5 hover:border-fold'
                      }`}
                    >
                      <input
                        type="radio"
                        name="level"
                        value={info.id}
                        checked={on}
                        onChange={() => setLevel(info.id)}
                        className="sr-only"
                      />
                      <span className="block text-[16px] font-extrabold tracking-tight text-ink">
                        {info.label}
                      </span>
                      <span className="mt-1 block text-[13px] leading-snug text-ink-dim">
                        {info.blurb}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {items.length > 0 && !working && (
            <button
              type="button"
              onClick={run}
              disabled={oversized}
              className="w-full rounded-full bg-brand px-6 py-4 text-[16px] font-bold text-white transition-colors duration-200 hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              {items.length === 1 ? 'Compress PDF' : `Compress ${items.length} PDFs`}
            </button>
          )}

          {phase.kind === 'working' && (
            <WorkingCard
              ratio={phase.progress.ratio}
              label={phase.progress.note}
              title={
                phase.total > 1
                  ? `File ${phase.done + 1} of ${phase.total}: ${phase.current}`
                  : undefined
              }
              note="Large scans can take a minute each. Everything runs in this tab, so leaving the page stops the job."
            />
          )}
        </>
      )}

      {phase.kind === 'results' && (
        <Results
          rows={phase.rows}
          onReset={resetAll}
          onDownloadAll={() => downloadAll(phase.rows)}
        />
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

  const single = ok.length === 1 ? ok[0] : null;

  return (
    <div className="animate-enter space-y-7">
      {ok.length > 0 && (
        <div className="flex flex-wrap items-start gap-4 rounded-[20px] bg-recess p-5 sm:p-6">
          <Pal state="done" className="h-12 w-12 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
          <p className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[32px]">
            {rows.length > 1 ? `${ok.length} of ${rows.length} compressed · ` : ''}
            {overallPct > 0 ? `${overallPct}% smaller` : 'Already tightly packed'}
          </p>
          <p className="num mt-1.5 text-[14px] text-ink-dim">
            {formatBytes(inTotal)} → {formatBytes(outTotal)} total
          </p>
          <div className="mt-4">
            {single ? (
              <SaveAs blob={single.blob!} defaultName={single.name} />
            ) : (
              <button
                type="button"
                onClick={onDownloadAll}
                className="rounded-full bg-brand px-5 py-3 text-[15px] font-bold text-white transition-colors hover:bg-brand-deep"
              >
                Download all (.zip)
              </button>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Each file keeps its own row and its own outcome. Nothing here is a
          toast that disappears before you have read it. */}
      <ul className="space-y-2.5">
        {rows.map((r, i) => (
          <li key={i} className="flex gap-4 rounded-[20px] border border-line p-3.5">
            <div className="grid h-[96px] w-[70px] shrink-0 place-items-center overflow-hidden rounded-[12px] bg-sunk">
              {r.thumbUrl ? (
                <img
                  src={r.thumbUrl}
                  alt={`First page of ${r.name}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-[11px] text-ink-dim">no preview</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-extrabold leading-tight tracking-tight text-ink">
                {r.name}
              </p>
              {r.error ? (
                <p className="mt-1.5 text-[13px] leading-relaxed text-danger">{r.error}</p>
              ) : (
                <>
                  <p className="num mt-1 text-[12.5px] text-ink-dim">
                    {formatBytes(r.inputBytes)} → {formatBytes(r.outputBytes ?? 0)} ·{' '}
                    {percentSmaller(r.inputBytes, r.outputBytes ?? r.inputBytes)}% smaller
                    {r.ms != null ? ` · ${formatDuration(r.ms)}` : ''}
                  </p>
                  {r.blob && !single && (
                    <div className="mt-2.5">
                      <SaveAs variant="inline" blob={r.blob} defaultName={r.name} />
                    </div>
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
        className="rounded-full border-2 border-line px-5 py-3 text-[15px] font-bold text-ink transition-colors hover:border-fold"
      >
        Compress more
      </button>
    </div>
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
