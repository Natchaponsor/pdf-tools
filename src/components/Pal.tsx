import type { SVGProps } from 'react';

export type PalState = 'resting' | 'alert' | 'working' | 'done' | 'stuck';

/**
 * The mark, with a face that answers what the app is actually doing.
 *
 * One component, one character, used on the home screen, inside every drop
 * zone, in every empty state and on every result. The rule that keeps it from
 * becoming a sticker: each state maps to a real application state, and nothing
 * else in the app animates a face. It is driven by app state rather than by
 * hover, so it works identically on a phone.
 *
 * Geometry is the logo's, unchanged: only the brows, eyes and mouth move.
 */
const FACES: Record<PalState, { brows: string | null; eyes: 'dot' | 'line' | 'arc'; mouth: string }> =
  {
    resting: { brows: 'M17 29H26 M38 29H47', eyes: 'dot', mouth: 'M26 43Q32 48 38 43' },
    // Brows lift and the smile opens: something is being handed over.
    alert: { brows: 'M17 27H26 M38 27H47', eyes: 'dot', mouth: 'M25 42Q32 50 39 42' },
    // Eyes narrow to concentrating lines while a real job runs.
    working: { brows: 'M17 28H26 M38 28H47', eyes: 'line', mouth: 'M27 44H37' },
    // Eyes become happy arcs. Only shown when something actually succeeded.
    done: { brows: null, eyes: 'arc', mouth: 'M25 42Q32 50 39 42' },
    // Brows tilt in, mouth goes flat and slightly rueful. Never alarming,
    // the copy beside it carries the problem and the recovery.
    stuck: { brows: 'M17 27L26 30 M47 27L38 30', eyes: 'dot', mouth: 'M26 45Q32 42 38 45' },
  };

interface Props extends SVGProps<SVGSVGElement> {
  state?: PalState;
  /** Tint for the folded corner; defaults to the brand's pale fold blue. */
  fold?: string;
}

export function Pal({ state = 'resting', fold = 'var(--color-fold)', className = '', ...rest }: Props) {
  const face = FACES[state];
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label={LABELS[state]}
      className={`${state === 'working' ? 'pal-working' : ''} ${className}`}
      {...rest}
    >
      <path d="M42 7V22H57Z" fill={fold} />
      <g
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M42 7H18A11 11 0 0 0 7 18V46A11 11 0 0 0 18 57H46A11 11 0 0 0 57 46V22Z" />
        <path d="M42 7V22H57" />
        {face.brows && <path d={face.brows} />}
        {face.eyes === 'line' && <path d="M18 35H25 M39 35H46" />}
        {face.eyes === 'arc' && <path d="M18 36Q21.5 31 25 36 M39 36Q42.5 31 46 36" />}
        <path d={face.mouth} />
      </g>
      {face.eyes === 'dot' && (
        <>
          <circle cx="21.5" cy="35" r="3" fill="currentColor" />
          <circle cx="42.5" cy="35" r="3" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

const LABELS: Record<PalState, string> = {
  resting: 'PaperPal',
  alert: 'PaperPal, ready to take the file',
  working: 'PaperPal, working',
  done: 'PaperPal, finished',
  stuck: 'PaperPal, stuck',
};
