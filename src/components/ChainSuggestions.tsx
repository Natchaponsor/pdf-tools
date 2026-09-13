import { getChainTargets } from '../data/tools';
import { setHandoff } from '../lib/handoff';
import { navigate } from '../lib/useHashRoute';

interface Props {
  /** Tool id this result came from. Omit to render nothing. */
  from?: string;
  blob: Blob;
  filename: string;
}

/** "Continue with…" shortcuts on a result card. Hands the file straight to another tool. */
export function ChainSuggestions({ from, blob, filename }: Props) {
  const targets = from ? getChainTargets(from) : [];
  if (!targets.length) return null;

  function go(route: string) {
    setHandoff(new File([blob], filename, { type: blob.type || 'application/octet-stream' }));
    navigate(route);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-brand-200/70 pt-3 dark:border-brand-800/70">
      <span className="text-xs font-medium text-ink-500 dark:text-white/50">Continue with</span>
      {targets.map((tool) => (
        <button
          key={tool.id}
          type="button"
          onClick={() => go(tool.route)}
          className="rounded-lg border border-brand-300 bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-700 dark:bg-white/5 dark:text-brand-300 dark:hover:bg-white/10"
        >
          {tool.title} →
        </button>
      ))}
    </div>
  );
}
