import { useState } from 'react';
import { compressPdf, COMPRESS_LEVELS, type CompressLevel } from '../lib/compress';
import { formatBytes, formatDuration, percentSmaller } from '../lib/format';

/**
 * Undocumented smoke-test page (#/selftest). Runs every compression level
 * against a file so the full worker + WASM path can be verified after a deploy.
 * Not linked from the UI.
 */
type Row = { level: CompressLevel; text: string; done: boolean };

export function SelfTest() {
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);

  async function runAll(file: File) {
    setRunning(true);
    setRows(COMPRESS_LEVELS.map((l) => ({ level: l.id, text: 'queued', done: false })));
    for (const info of COMPRESS_LEVELS) {
      const t0 = performance.now();
      try {
        const out = await compressPdf(file, info.id, (p) =>
          update(info.id, p.note, false),
        );
        update(
          info.id,
          `${formatBytes(file.size)} → ${formatBytes(out.outputBytes)} · ${percentSmaller(
            file.size,
            out.outputBytes,
          )}% smaller · ${formatDuration(out.ms)} (wall ${formatDuration(
            performance.now() - t0,
          )})`,
          true,
        );
      } catch (err) {
        update(info.id, `ERROR: ${err instanceof Error ? err.message : String(err)}`, true);
      }
    }
    setRunning(false);
  }

  function update(level: CompressLevel, text: string, done: boolean) {
    setRows((prev) => prev.map((r) => (r.level === level ? { ...r, text, done } : r)));
  }

  async function useFixture() {
    const res = await fetch(`${import.meta.env.BASE_URL}scan45.pdf`);
    if (!res.ok) {
      alert('No fixture at /scan45.pdf — use the file picker instead.');
      return;
    }
    const blob = await res.blob();
    await runAll(new File([blob], 'scan45.pdf', { type: 'application/pdf' }));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Compression self-test</h1>
      <p className="text-sm text-ink-500">
        crossOriginIsolated: <code>{String(self.crossOriginIsolated)}</code> · SharedArrayBuffer:{' '}
        <code>{String(typeof SharedArrayBuffer !== 'undefined')}</code>
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={running}
          onClick={useFixture}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Run on /scan45.pdf
        </button>
        <label className="rounded-lg border border-paper-200 px-3 py-2 text-sm font-semibold">
          Pick a PDF…
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={running}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void runAll(f);
            }}
          />
        </label>
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.level} className="rounded-lg border border-paper-200 bg-white p-3">
            <span className="font-semibold">{r.level}</span>{' '}
            <span className={r.done ? '' : 'text-ink-500'}>{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
