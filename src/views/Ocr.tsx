import { useEffect, useRef, useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { SaveAs } from '../components/SaveAs';
import { FileRow } from './AddPageNumbers';
import { formatBytes, formatDuration } from '../lib/format';
import { downloadBlob } from '../lib/download';
import { errorMessage } from '../lib/errors';
import {
  runOcr,
  OCR_LANGS,
  OCR_QUALITY,
  type OcrLang,
  type OcrQuality,
  type OcrProgress,
  type OcrResult,
} from '../lib/ocr';

export function Ocr() {
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState<OcrLang>('eng');
  const [quality, setQuality] = useState<OcrQuality>('standard');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<OcrProgress>({ ratio: null, note: '' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);

  const textUrl = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (textUrl.current) URL.revokeObjectURL(textUrl.current);
    },
    [],
  );

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const out = await runOcr(file, { lang, quality, onProgress: setProgress });
      setResult(out);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    if (textUrl.current) URL.revokeObjectURL(textUrl.current);
    textUrl.current = null;
    setFile(null);
    setResult(null);
    setError(null);
    setProgress({ ratio: null, note: '' });
  }

  const stem = file?.name.replace(/\.pdf$/i, '') ?? 'document';

  return (
    <ToolShell
      title="OCR — make scans searchable"
      blurb="Recognise the text in a scanned PDF and add an invisible text layer, so you can select, copy, and search it. Or pull the text out as a .txt file."
    >
      {error && <Notice tone="error">{error}</Notice>}

      {!file && (
        <FileDrop
          accept="application/pdf,.pdf"
          hint="One PDF"
          onFiles={(f) => {
            setResult(null);
            setError(null);
            setFile(f[0] ?? null);
          }}
        />
      )}

      {file && result && (
        <div className="space-y-4">
          <div className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
            <div>
              <p className="text-xl font-bold text-brand-800 dark:text-brand-200">
                Searchable PDF ready
              </p>
              <p className="mt-1 text-sm text-ink-500 dark:text-white/60">
                {result.pageCount} {result.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                {formatBytes(result.pdf.size)} · {formatDuration(result.ms)}
              </p>
            </div>
            <SaveAs blob={result.pdf} defaultName={`${stem}-ocr.pdf`} />
            {result.text && (
              <button
                type="button"
                onClick={() =>
                  downloadBlob(
                    new Blob([result.text], { type: 'text/plain' }),
                    `${stem}.txt`,
                  )
                }
                className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
              >
                Download extracted text (.txt)
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="block text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
            >
              Start over
            </button>
          </div>

          {result.text ? (
            <details className="rounded-2xl border border-paper-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <summary className="cursor-pointer text-sm font-semibold text-ink-700 dark:text-white/80">
                Preview recognised text
              </summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-ink-700 dark:text-white/70">
                {result.text}
              </pre>
            </details>
          ) : (
            <Notice tone="warn">
              No text was recognised. The pages may be blank, handwritten, or too
              low-resolution — try the “Best (300 dpi)” quality.
            </Notice>
          )}
        </div>
      )}

      {file && !result && (
        <div className="space-y-5">
          <FileRow file={file} onClear={reset} />

          <Segmented
            label="Language"
            value={lang}
            options={OCR_LANGS.map((l) => [l.code, l.label] as [OcrLang, string])}
            onChange={setLang}
          />
          <Segmented
            label="Quality"
            value={quality}
            options={OCR_QUALITY.map((q) => [q.id, q.label] as [OcrQuality, string])}
            onChange={setQuality}
          />

          <Notice tone="info">
            The first run downloads the OCR engine and the English model (~7 MB), then
            works offline. Recognition happens entirely on your device — expect roughly
            2–10 seconds per page, more on a phone.
          </Notice>

          {busy ? (
            <div className="space-y-2">
              <ProgressBar ratio={progress.ratio} label={progress.note || 'Working…'} />
              <p className="text-xs text-ink-500 dark:text-white/50">
                Keep this tab open — closing it stops the job.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={run}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
            >
              Run OCR
            </button>
          )}
        </div>
      )}
    </ToolShell>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink-700 dark:text-white/80">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([val, text]) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              value === val
                ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                : 'border-paper-200 dark:border-white/15'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
