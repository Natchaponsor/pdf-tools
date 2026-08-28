import { navigate } from '../lib/useHashRoute';
import { PRIVACY_LINE } from '../lib/constants';
import { TOOLS } from '../data/tools';

export function Home({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-6">
      {!compact && (
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Private PDF tools</h1>
          <p className="text-ink-500 dark:text-white/60">
            Compress, merge, split, convert. Everything runs in your browser — {PRIVACY_LINE.toLowerCase()}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => navigate(tool.route)}
            className="flex flex-col gap-2 rounded-2xl border border-paper-200 bg-white p-4 text-left transition-colors hover:border-brand-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-white/10 dark:bg-white/5 dark:hover:border-brand-500"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <tool.icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold leading-tight text-ink-900 dark:text-white">
              {tool.title}
            </span>
            <span className="text-xs leading-snug text-ink-500 dark:text-white/60">
              {tool.blurb}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
