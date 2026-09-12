import { navigate } from '../lib/useHashRoute';
import { TOOL_SECTIONS, type Tool } from '../data/tools';

export function Home({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-8">
      {!compact && (
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-ink-900 dark:text-white">
            Private PDF tools
          </h1>
          <p className="text-base text-ink-500 dark:text-white/60">
            Manage your PDFs easily in your browser.
          </p>
        </div>
      )}

      {TOOL_SECTIONS.map((section) => {
        // The unlabeled main section leads with its headline tools (marked
        // `featured` in tools.ts) as full-width features, not equal-weight
        // cards in the grid — everything else stays a plain grid.
        const isMain = section.title === null;
        const featured = isMain ? section.tools.filter((t) => t.featured) : [];
        const gridTools = isMain ? section.tools.filter((t) => !t.featured) : section.tools;
        return (
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
            {featured.length > 0 && (
              <div className="space-y-3">
                {featured.map((tool) => (
                  <FeaturedToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {gridTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FeaturedToolCard({ tool }: { tool: Tool }) {
  return (
    <button
      type="button"
      onClick={() => navigate(tool.route)}
      className="group flex w-full items-center gap-4 rounded-2xl bg-brand-700 p-5 text-left transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-[0_16px_32px_-12px_rgba(29,79,196,0.5)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300 sm:gap-5 sm:p-6 dark:bg-brand-800 dark:hover:bg-brand-900"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white/15 text-white transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-3 sm:h-16 sm:w-16">
        <tool.icon className="h-8 w-8" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-bold text-white sm:text-2xl">{tool.title}</span>
        <span className="mt-0.5 block text-sm text-brand-100">{tool.blurb}</span>
      </span>
      <svg
        className="hidden h-6 w-6 shrink-0 text-white/70 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 sm:block"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <button
      type="button"
      onClick={() => navigate(tool.route)}
      className="group tool-card flex flex-col gap-2.5 rounded-2xl border border-paper-200 bg-white p-4 text-left transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_12px_24px_-10px_rgba(37,99,235,0.3)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:p-5 dark:border-white/10 dark:bg-white/5 dark:hover:border-brand-500"
    >
      <span className="flex items-center justify-between">
        <span className="tool-card__icon grid h-11 w-11 place-items-center rounded-lg bg-brand-50 text-brand-700 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-3 sm:h-12 sm:w-12 dark:bg-brand-900/40 dark:text-brand-300">
          <tool.icon className="h-6 w-6" />
        </span>
        <svg
          className="h-4 w-4 shrink-0 -translate-x-1 text-brand-500 opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0 group-hover:opacity-100 dark:text-brand-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
