import type { ReactNode } from 'react';
import { navigate } from '../lib/useHashRoute';
import { PRIVACY_LINE } from '../lib/constants';
import { IconBack } from './icons';

interface Props {
  title: string;
  blurb: string;
  children: ReactNode;
}

export function ToolShell({ title, blurb, children }: Props) {
  return (
    <div className="space-y-6">
      <ToolHeader title={title} blurb={blurb} />
      {children}
    </div>
  );
}

export function ToolHeader({ title, blurb }: { title: string; blurb: string }) {
  return (
    <header className="pt-2">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[14px] font-bold text-ink-dim transition-colors hover:text-ink"
      >
        <IconBack className="h-4 w-4" />
        All tools
      </button>
      <h1 className="mt-3 text-[34px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[42px]">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-dim">{blurb}</p>
      <p className="mt-2 text-[13px] text-ink-dim">{PRIVACY_LINE}</p>
    </header>
  );
}
