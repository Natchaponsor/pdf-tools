interface Props {
  /** 0–1, or null for an indeterminate/marquee bar. */
  ratio: number | null;
  label: string;
}

export function ProgressBar({ ratio, label }: Props) {
  const pct = ratio == null ? null : Math.max(3, Math.round(ratio * 100));
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper-100 dark:bg-white/10">
        <div
          className={`h-full rounded-full bg-brand-500 transition-[width] duration-300 ${
            pct == null ? 'animate-pulse w-1/3' : ''
          }`}
          style={pct == null ? undefined : { width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-ink-500 dark:text-white/60">{label}</p>
    </div>
  );
}
