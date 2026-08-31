import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { navigate, useHashRoute } from './lib/useHashRoute';
import { IconGitHub } from './components/icons';
import { Home } from './views/Home';

const REPO = 'https://github.com/Natchaponsor/pdf-tools';

const lazyViews: Record<string, ComponentType> = {
  '/settings': lazy(() => import('./views/Settings').then((m) => ({ default: m.Settings }))),
  '/compress': lazy(() => import('./views/CompressPdf').then((m) => ({ default: m.CompressPdf }))),
  '/merge': lazy(() => import('./views/MergePdf').then((m) => ({ default: m.MergePdf }))),
  '/split': lazy(() => import('./views/SplitPdf').then((m) => ({ default: m.SplitPdf }))),
  '/organize': lazy(() => import('./views/OrganizePages').then((m) => ({ default: m.OrganizePages }))),
  '/pdf-to-image': lazy(() => import('./views/PdfToImage').then((m) => ({ default: m.PdfToImage }))),
  '/images-to-pdf': lazy(() => import('./views/ImagesToPdf').then((m) => ({ default: m.ImagesToPdf }))),
  '/compress-image': lazy(() => import('./views/CompressImage').then((m) => ({ default: m.CompressImage }))),
  '/page-numbers': lazy(() => import('./views/AddPageNumbers').then((m) => ({ default: m.AddPageNumbers }))),
  '/watermark': lazy(() => import('./views/AddWatermark').then((m) => ({ default: m.AddWatermark }))),
  '/selftest': lazy(() => import('./views/SelfTest').then((m) => ({ default: m.SelfTest }))),
};

function View({ route }: { route: string }) {
  const base = '/' + (route.split('/')[1] ?? '');
  if (base === '/tools') return <Home compact />;
  const Lazy = lazyViews[base];
  if (Lazy) return <Lazy />;
  return <Home />;
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      aria-current={active ? 'page' : undefined}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
          : 'text-ink-500 hover:text-ink-900 dark:text-white/60 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export function App() {
  const route = useHashRoute();
  const base = '/' + (route.split('/')[1] ?? '');

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-16 pt-5 sm:px-6">
        <header className="mb-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 font-bold text-ink-900 dark:text-white"
            aria-label="Paperplane home"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M21 3 3 10.5l7 2.5 2 7 3-5.5 4 3z" />
              </svg>
            </span>
            Paperplane
          </button>
          <nav className="flex items-center gap-1">
            <NavLink to="/tools" active={base === '/tools'}>
              Tools
            </NavLink>
            <NavLink to="/settings" active={base === '/settings'}>
              Settings
            </NavLink>
          </nav>
        </header>

        <main className="flex-1">
          <Suspense fallback={<p className="py-10 text-center text-sm text-ink-500">Loading…</p>}>
            <View route={route} />
          </Suspense>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="bg-[#161616] text-neutral-300">
      <div className="mx-auto max-w-2xl px-4 py-11 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M21 3 3 10.5l7 2.5 2 7 3-5.5 4 3z" />
            </svg>
          </span>
          <span className="text-lg font-bold text-white">Paperplane</span>
        </div>

        <p className="mt-3 max-w-xs text-sm text-neutral-400">
          Manage your PDFs easily in your browser.
        </p>

        <a
          href={REPO}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Paperplane on GitHub"
          className="mt-6 grid h-10 w-10 place-items-center rounded-full border border-white/15 text-neutral-300 transition-colors hover:border-white/40 hover:text-white"
        >
          <IconGitHub className="h-5 w-5" />
        </a>

        <div className="mt-9 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/10 pt-5 text-xs text-neutral-500">
          <span>© 2026 Top Sortrakul · AGPL-3.0 · Built with Claude Code</span>
          <a
            href={`${REPO}/issues/new`}
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold text-neutral-300 transition-colors hover:text-white"
          >
            Feedback →
          </a>
        </div>
      </div>
    </footer>
  );
}
