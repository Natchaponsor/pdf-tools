import { navigate } from '../lib/useHashRoute';
import { TOOLS } from '../data/tools';

export function Home({ compact = false }: { compact?: boolean }) {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      {!compact && (
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Private PDF tools</h1>
          <p className="text-sm text-ink-500 dark:text-white/60">
            Manage your PDFs easily in your browser.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => navigate(tool.route)}
            className="tool-card flex flex-col gap-2 rounded-2xl border border-paper-200 bg-white p-3 text-left transition-colors hover:border-brand-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:p-4 dark:border-white/10 dark:bg-white/5 dark:hover:border-brand-500"
          >
            <span className="tool-card__icon grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700 sm:h-10 sm:w-10 dark:bg-brand-900/40 dark:text-brand-300">
              <tool.icon className="h-5 w-5" />
            </span>
            <span className="tool-card__title text-sm font-bold leading-tight text-ink-900 dark:text-white">
              {tool.title}
            </span>
            <span className="tool-card__blurb line-clamp-3 text-xs leading-snug text-ink-500 dark:text-white/60">
              {tool.blurb}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
