import type { ReactNode } from 'react';

interface Props {
  tone: 'warn' | 'error' | 'info';
  children: ReactNode;
}

const TONES: Record<Props['tone'], string> = {
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
  warn: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  info: 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200',
};

export function Notice({ tone, children }: Props) {
  return <div className={`rounded-xl border p-4 text-sm ${TONES[tone]}`}>{children}</div>;
}
