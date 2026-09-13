interface Props {
  /** 0–1, or null for an indeterminate bar. */
  ratio: number | null;
  label: string;
}

export function ProgressBar({ ratio, label }: Props) {
  const pct = ratio == null ? null : Math.max(3, Math.round(ratio * 100));
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="h-2 w-full overflow-hidden rounded-full bg-sunk">
        <div
          className={`h-full rounded-full bg-brand transition-[width] duration-300 ease-out ${
            pct == null ? 'w-1/3 animate-pulse' : ''
          }`}
          style={pct == null ? undefined : { width: `${pct}%` }}
        />
      </div>
      <p className="flex items-baseline justify-between gap-3 text-[13.5px] text-ink-dim">
        <span>{label}</span>
        {/* Ghostscript does not stream per-page progress out of WebAssembly, so
            the heavier levels genuinely have no percentage to show. Better a
            moving bar than an invented number. */}
        {pct != null && <span className="num">{pct}%</span>}
      </p>
    </div>
  );
}
