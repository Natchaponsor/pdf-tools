import { useState } from 'react';
import { downloadBlob, resolveFilename, splitName } from '../lib/download';

interface Props {
  blob: Blob;
  /** The pre-filled name, e.g. "report-compressed.pdf". */
  defaultName: string;
  /** 'button' = full-width name field + primary button; 'inline' = compact row. */
  variant?: 'button' | 'inline';
  label?: string;
  onDownloaded?: () => void;
}

/**
 * Lets the user edit the file name before saving. The extension is fixed and
 * shown as a suffix so it can't be lost. An empty name falls back to the
 * original stem.
 */
export function SaveAs({ blob, defaultName, variant = 'button', label = 'Download', onDownloaded }: Props) {
  const { stem, ext } = splitName(defaultName);
  const [value, setValue] = useState(stem);

  function save() {
    downloadBlob(blob, resolveFilename(value, ext, stem));
    onDownloaded?.();
  }

  if (variant === 'inline') {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="flex min-w-0 items-center rounded-lg border border-paper-200 bg-white text-sm dark:border-white/15 dark:bg-white/10">
          <input
            aria-label="File name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-w-0 flex-1 rounded-l-lg bg-transparent px-2 py-1 outline-none"
          />
          <span className="pr-2 text-ink-500 dark:text-white/50">{ext}</span>
        </span>
        <button
          type="button"
          onClick={save}
          className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Save
        </button>
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      <span className="flex min-w-0 flex-1 items-center rounded-xl border border-paper-200 bg-white dark:border-white/15 dark:bg-white/10">
        <input
          aria-label="File name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-0 flex-1 rounded-l-xl bg-transparent px-3 py-2.5 text-sm outline-none"
        />
        <span className="pr-3 text-sm text-ink-500 dark:text-white/50">{ext}</span>
      </span>
      <button
        type="button"
        onClick={save}
        className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
      >
        {label}
      </button>
    </div>
  );
}
