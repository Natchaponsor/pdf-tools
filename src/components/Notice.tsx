import type { ReactNode } from 'react';
import { Pal } from './Pal';

interface Props {
  tone: 'warn' | 'error' | 'info';
  children: ReactNode;
}

/**
 * The pal delivers bad news itself rather than a coloured alert box doing it.
 * Nothing shouts: the copy carries the problem and the recovery, and the face
 * carries the tone.
 */
export function Notice({ tone, children }: Props) {
  return (
    <div
      className="animate-enter flex items-start gap-3.5 rounded-[20px] bg-recess p-4"
      role={tone === 'error' ? 'alert' : undefined}
    >
      <Pal
        state={tone === 'info' ? 'resting' : 'stuck'}
        className={`h-9 w-9 shrink-0 ${tone === 'info' ? 'text-brand' : 'text-danger'}`}
      />
      <div className="pt-0.5 text-[14.5px] leading-relaxed text-ink">{children}</div>
    </div>
  );
}
