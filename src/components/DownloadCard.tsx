import { downloadBlob } from '../lib/download';

interface Props {
  headline: string;
  detail?: string;
  filename: string;
  blob: Blob;
  onReset: () => void;
  resetLabel?: string;
}

export function DownloadCard({
  headline,
  detail,
  filename,
  blob,
  onReset,
  resetLabel = 'Start over',
}: Props) {
  return (
    <div className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
      <div>
        <p className="text-xl font-bold text-brand-800 dark:text-brand-200">{headline}</p>
        {detail && <p className="mt-1 text-sm text-ink-500 dark:text-white/60">{detail}</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => downloadBlob(blob, filename)}
          className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
        >
          Download
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-brand-300 px-4 py-2.5 font-semibold text-brand-700 hover:bg-white dark:border-brand-700 dark:text-brand-200 dark:hover:bg-white/10"
        >
          {resetLabel}
        </button>
      </div>
    </div>
  );
}
