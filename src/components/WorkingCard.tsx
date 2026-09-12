import type { ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';
import { IconLoader } from './icons';

interface Props {
  ratio: number | null;
  label: string;
  title?: ReactNode;
  note?: ReactNode;
}

/** The "processing" card — an icon chip beside a progress bar, for any tool running a longer engine step. */
export function WorkingCard({ ratio, label, title, note }: Props) {
  return (
    <div className="animate-enter flex items-start gap-4 rounded-2xl border border-paper-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        <IconLoader className="h-5 w-5 animate-spin" />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {title && <p className="text-sm font-medium text-ink-700 dark:text-white/80">{title}</p>}
        <ProgressBar ratio={ratio} label={label} />
        {note && <p className="text-xs text-ink-500 dark:text-white/50">{note}</p>}
      </div>
    </div>
  );
}
