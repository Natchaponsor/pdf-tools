import { navigate } from '../lib/useHashRoute';
import { TOOL_SECTIONS, type Tool } from '../data/tools';

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

      {TOOL_SECTIONS.map((section) => (
        <section key={section.id} className="space-y-3">
          {section.title && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-white/50">
                {section.title}
              </h2>
              {section.description && (
                <p className="mt-1 text-[13px] text-ink-500 dark:text-white/50">
                  {section.description}
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {section.tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <button
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
  );
}
