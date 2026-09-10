import { useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { Notice } from '../components/Notice';
import { SaveAs } from '../components/SaveAs';
import { OcrCapture, type OcrOutcome } from '../components/OcrCapture';
import { canShareText, shareText, googleTranslateUrl, copyText } from '../lib/share';
import { bcp47ForLang } from '../lib/ocr';
import { formatDuration } from '../lib/format';

const TARGETS = [
  { code: 'en', label: 'English' },
  { code: 'th', label: 'Thai' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
];

export function Translate() {
  const [outcome, setOutcome] = useState<OcrOutcome | null>(null);
  const [target, setTarget] = useState('en');
  const [toast, setToast] = useState<string | null>(null);

  function onResult(o: OcrOutcome) {
    setOutcome(o);
    // Default target = the language that isn't the document's.
    setTarget(bcp47ForLang(o.lang) === 'th' ? 'en' : 'th');
  }

  async function translate() {
    if (!outcome) return;
    const url = googleTranslateUrl(outcome.text, target, bcp47ForLang(outcome.lang));
    if (canShareText()) {
      const r = await shareText('Text to translate', outcome.text);
      if (r === 'shared' || r === 'cancelled') return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function copy() {
    if (!outcome) return;
    setToast((await copyText(outcome.text)) ? 'Copied to clipboard' : 'Could not copy');
    setTimeout(() => setToast(null), 2000);
  }

  const stem = 'document';

  return (
    <ToolShell
      title="Translate a PDF"
      blurb="Pull the text out of a scanned PDF on your device, then send it to your translator of choice in one tap."
    >
      {!outcome ? (
        <OcrCapture actionLabel="Get the text" langLabel="Document language" onResult={onResult} />
      ) : (
        <div className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
            <div>
              <p className="text-xl font-bold text-brand-800 dark:text-brand-200">
                Text recognised
              </p>
              <p className="mt-1 text-sm text-ink-500 dark:text-white/60">
                {outcome.pageCount} {outcome.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                {formatDuration(outcome.ms)}
              </p>
            </div>

            <label className="block text-sm font-semibold text-ink-700 dark:text-white/80">
              Translate into
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm font-normal dark:border-white/15 dark:bg-white/10"
              >
                {TARGETS.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={translate}
                className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
              >
                Translate
              </button>
              <button
                type="button"
                onClick={copy}
                className="rounded-xl border border-paper-200 px-4 py-2.5 font-semibold text-ink-700 hover:border-brand-300 dark:border-white/15 dark:text-white/80"
              >
                Copy text
              </button>
            </div>
            {toast && <p className="text-xs text-ink-500 dark:text-white/50">{toast}</p>}
          </div>

          <p className="text-xs text-ink-500 dark:text-white/50">
            The translation happens in the app you pick. On a phone, “Translate” opens the share
            sheet, where you choose Google Translate, Apple Translate, or any translator. The
            recognised text is shared only when you tap it.
          </p>

          <div className="rounded-2xl border border-paper-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <p className="mb-2 text-sm font-semibold text-ink-700 dark:text-white/80">
              Recognised text
            </p>
            <div className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-700 dark:text-white/70">
              {outcome.text}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SaveAs blob={outcome.pdf} defaultName={`${stem}-ocr.pdf`} variant="inline" label="Searchable PDF" />
            <button
              type="button"
              onClick={() => setOutcome(null)}
              className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
            >
              Start over
            </button>
          </div>

          <Notice tone="info">
            Only printed text is recognised, not handwriting. Pick the document’s language above
            for the best results. Thai text needs the Thai model selected.
          </Notice>
        </div>
      )}
    </ToolShell>
  );
}
