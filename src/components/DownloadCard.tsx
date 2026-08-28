import { SaveAs } from './SaveAs';

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
      <SaveAs blob={blob} defaultName={filename} />
      <button
        type="button"
        onClick={onReset}
        className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
      >
        {resetLabel}
      </button>
    </div>
  );
}
