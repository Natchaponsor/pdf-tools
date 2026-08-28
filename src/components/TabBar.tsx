import { navigate } from '../lib/useHashRoute';
import { IconHome, IconGrid, IconSettings } from './icons';

const TABS = [
  { route: '/', label: 'Home', icon: IconHome, match: (r: string) => r === '/' },
  { route: '/tools', label: 'Tools', icon: IconGrid, match: (r: string) => r !== '/' && r !== '/settings' },
  { route: '/settings', label: 'Settings', icon: IconSettings, match: (r: string) => r === '/settings' },
];

export function TabBar({ route }: { route: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-paper-200 bg-[var(--bg)]/95 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex max-w-2xl">
        {TABS.map((tab) => {
          const active = tab.match(route);
          return (
            <button
              key={tab.route}
              type="button"
              onClick={() => navigate(tab.route)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                active ? 'text-brand-700 dark:text-brand-300' : 'text-ink-500 dark:text-white/50'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
