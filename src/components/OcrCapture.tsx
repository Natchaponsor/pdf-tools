import { useState } from 'react';
import { FileDrop } from './FileDrop';
import { Notice } from './Notice';
import { ProgressBar } from './ProgressBar';
import { FileRow } from '../views/AddPageNumbers';
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

export interface OcrOutcome extends OcrResult {
  lang: OcrLang;
}

interface Props {
  /** Primary button verb, e.g. "Translate" or "Read aloud". */
  actionLabel: string;
  /** Label above the language picker — it's the document's language here. */
  langLabel?: string;
  onResult: (outcome: OcrOutcome) => void;
}

/**
 * The shared front half of the Translate and Read-aloud tools: pick a PDF,
 * choose its language and a scan quality, then run OCR. Calls `onResult` with
 * the recognised text (and a searchable-PDF blob) when it finishes.
 */
export function OcrCapture({ actionLabel, langLabel = 'Document language', onResult }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState<OcrLang>('eng');
  const [quality, setQuality] = useState<OcrQuality>('standard');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<OcrProgress>({ ratio: null, note: '' });
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await runOcr(file, { lang, quality, onProgress: setProgress });
      if (!result.text.trim()) {
        setError(
          'No text was recognised. The pages may be blank, handwritten, low-resolution, or in a language other than the one selected.',
        );
        return;
      }
      onResult({ ...result, lang });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!file) {
    return (
      <>
        {error && <Notice tone="error">{error}</Notice>}
        <FileDrop
          accept="application/pdf,.pdf"
          hint="One PDF"
          onFiles={(f) => {
            setError(null);
            setFile(f[0] ?? null);
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-5">
      {error && <Notice tone="error">{error}</Notice>}

      <FileRow
        file={file}
        onClear={() => {
          setFile(null);
          setError(null);
        }}
      />

      <Segmented
        label={langLabel}
        value={lang}
        options={OCR_LANGS.map((l) => [l.code, l.label] as [OcrLang, string])}
        onChange={setLang}
      />
      <Segmented
        label="Scan quality"
        value={quality}
        options={OCR_QUALITY.map((q) => [q.id, q.label] as [OcrQuality, string])}
        onChange={setQuality}
      />

      <Notice tone="info">
        The first run downloads the OCR engine and the {OCR_LANGS.find((l) => l.code === lang)?.label}{' '}
        model, then works offline. Recognition happens entirely on your device, so expect roughly
        2 to 10 seconds per page, more on a phone.
      </Notice>

      {busy ? (
        <div className="space-y-2">
          <ProgressBar ratio={progress.ratio} label={progress.note || 'Working…'} />
          <p className="text-xs text-ink-500 dark:text-white/50">
            Keep this tab open. Closing it stops the job.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={run}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
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
