import type { ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';
import { Pal } from './Pal';

interface Props {
  ratio: number | null;
  label: string;
  title?: ReactNode;
  note?: ReactNode;
}

export function WorkingCard({ ratio, label, title, note }: Props) {
  return (
    <div className="animate-enter flex items-start gap-4 rounded-[20px] bg-recess p-5">
      <Pal state="working" className="h-11 w-11 shrink-0 text-brand" />
      <div className="min-w-0 flex-1 space-y-3">
        {title && <p className="text-[15px] font-bold text-ink">{title}</p>}
        <ProgressBar ratio={ratio} label={label} />
        {note && <p className="text-[12.5px] leading-relaxed text-ink-dim">{note}</p>}
      </div>
    </div>
  );
}
