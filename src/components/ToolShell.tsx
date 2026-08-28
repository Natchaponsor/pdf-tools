import type { ReactNode } from 'react';
import { navigate } from '../lib/useHashRoute';
import { IconBack } from './icons';

interface Props {
  title: string;
  blurb: string;
  children: ReactNode;
}

export function ToolShell({ title, blurb, children }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-3 -ml-1 flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900 dark:text-white/60 dark:hover:text-white"
        >
          <IconBack className="h-4 w-4" />
          All tools
        </button>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{title}</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-white/60">{blurb}</p>
      </div>
      {children}
    </div>
  );
}
