import { navigate } from '../lib/useHashRoute';
import { TOOLS } from '../data/tools';

export function Home({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-8">
      {!compact && (
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white">
            Private PDF tools
          </h1>
          <p className="text-base text-ink-500 dark:text-white/60">
            Manage your PDFs easily in your browser.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => navigate(tool.route)}
            className="tool-card flex flex-col gap-2.5 rounded-2xl border border-paper-200 bg-white p-4 text-left transition-colors hover:border-brand-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:p-5 dark:border-white/10 dark:bg-white/5 dark:hover:border-brand-500"
          >
            <span className="tool-card__icon grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 sm:h-12 sm:w-12 dark:bg-brand-900/40 dark:text-brand-300">
              <tool.icon className="h-6 w-6" />
            </span>
            <span className="tool-card__title text-[15px] font-bold leading-tight text-ink-900 dark:text-white">
              {tool.title}
            </span>
            <span className="tool-card__blurb line-clamp-3 text-[13px] leading-snug text-ink-500 dark:text-white/60">
              {tool.blurb}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
