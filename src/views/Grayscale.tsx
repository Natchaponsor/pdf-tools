import { useEffect, useRef, useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { DownloadCard } from '../components/DownloadCard';
import { FileRow } from './AddPageNumbers';
import { runGhostscript, type GsProgress } from '../lib/ghostscript';
import { formatBytes, percentSmaller } from '../lib/format';
import { errorMessage } from '../lib/errors';

const GRAYSCALE_ARGS = [
  '-sColorConversionStrategy=Gray',
  '-sColorConversionStrategyForImages=Gray',
  '-dProcessColorModel=/DeviceGray',
  '-dOverrideICC=true',
  '-dAutoRotatePages=/None',
];

export function Grayscale() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<GsProgress>({ ratio: null, note: '' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; bytes: number } | null>(null);
  const outUrl = useRef<string | null>(null);

  useEffect(() => () => {
    if (outUrl.current) URL.revokeObjectURL(outUrl.current);
  }, []);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const out = await runGhostscript(file, GRAYSCALE_ARGS, setProgress, 'Converting');
      outUrl.current = URL.createObjectURL(out.blob);
      setResult({ blob: out.blob, bytes: out.outputBytes });
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
  const saved = result && file ? percentSmaller(file.size, result.bytes) : 0;

  return (
    <ToolShell
      title="Grayscale PDF"
      blurb="Convert every colour page to black and white — for cheaper printing or a smaller file."
    >
      {error && <Notice tone="error">{error}</Notice>}

      {!file && (
        <FileDrop accept="application/pdf,.pdf" hint="One PDF" onFiles={(f) => setFile(f[0] ?? null)} />
      )}

      {file && result && (
        <DownloadCard
          headline="Converted to grayscale"
          detail={
            file
              ? `${formatBytes(file.size)} → ${formatBytes(result.bytes)}${
                  saved > 0 ? ` · ${saved}% smaller` : ''
                }`
              : formatBytes(result.bytes)
          }
          filename={`${base}-gray.pdf`}
          blob={result.blob}
          onReset={reset}
        />
      )}

      {file && !result && (
        <div className="space-y-4">
          <FileRow file={file} onClear={reset} />

          <Notice tone="info">
            Text and vector graphics stay crisp; image resolution is untouched. Colour information is
            removed for good — keep the original if you might need it.
          </Notice>

          {busy ? (
            <div className="space-y-2">
              <ProgressBar ratio={progress.ratio} label={progress.note || 'Loading the engine…'} />
              <p className="text-xs text-ink-500 dark:text-white/50">
                Large or image-heavy PDFs can take a minute.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={run}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
            >
              Convert to grayscale
            </button>
          )}
        </div>
      )}
    </ToolShell>
  );
}
