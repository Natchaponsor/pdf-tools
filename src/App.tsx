import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { navigate, useHashRoute } from './lib/useHashRoute';
import { IconGitHub } from './components/icons';
import { Pal } from './components/Pal';
import { PwaPrompt } from './components/PwaPrompt';
import { ViewErrorBoundary } from './components/ViewErrorBoundary';
import { ViewSkeleton } from './components/ViewSkeleton';
import { Home } from './views/Home';

const REPO = 'https://github.com/Natchaponsor/pdf-tools';

const lazyViews: Record<string, ComponentType> = {
  '/settings': lazy(() => import('./views/Settings').then((m) => ({ default: m.Settings }))),
  '/compress': lazy(() => import('./views/CompressPdf').then((m) => ({ default: m.CompressPdf }))),
  '/scan': lazy(() => import('./views/ScanDocuments').then((m) => ({ default: m.ScanDocuments }))),
  '/translate': lazy(() => import('./views/Translate').then((m) => ({ default: m.Translate }))),
  '/read-aloud': lazy(() => import('./views/ReadAloud').then((m) => ({ default: m.ReadAloud }))),
  '/merge': lazy(() => import('./views/MergePdf').then((m) => ({ default: m.MergePdf }))),
  '/split': lazy(() => import('./views/SplitPdf').then((m) => ({ default: m.SplitPdf }))),
  '/organize': lazy(() => import('./views/OrganizePages').then((m) => ({ default: m.OrganizePages }))),
  '/pdf-to-image': lazy(() => import('./views/PdfToImage').then((m) => ({ default: m.PdfToImage }))),
  '/images-to-pdf': lazy(() => import('./views/ImagesToPdf').then((m) => ({ default: m.ImagesToPdf }))),
  '/compress-image': lazy(() => import('./views/CompressImage').then((m) => ({ default: m.CompressImage }))),
  '/page-numbers': lazy(() => import('./views/AddPageNumbers').then((m) => ({ default: m.AddPageNumbers }))),
  '/watermark': lazy(() => import('./views/AddWatermark').then((m) => ({ default: m.AddWatermark }))),
  '/rotate': lazy(() => import('./views/RotatePdf').then((m) => ({ default: m.RotatePdf }))),
  '/protect': lazy(() => import('./views/ProtectPdf').then((m) => ({ default: m.ProtectPdf }))),
  '/grayscale': lazy(() => import('./views/Grayscale').then((m) => ({ default: m.Grayscale }))),
  '/remove-blank-pages': lazy(() =>
    import('./views/RemoveBlankPages').then((m) => ({ default: m.RemoveBlankPages })),
  ),
  '/extract-images': lazy(() =>
    import('./views/ExtractImages').then((m) => ({ default: m.ExtractImages })),
  ),
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
      className={`rounded-full px-4 py-2 text-[15px] font-bold transition-colors duration-200 ${
        active ? 'bg-chip text-brand' : 'text-ink-dim hover:bg-sunk hover:text-ink'
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
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="sticky top-0 z-30 bg-page/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="group flex items-center gap-2.5"
            aria-label="PaperPal home"
          >
            <Pal className="h-8 w-8 text-brand transition-transform duration-300 ease-[cubic-bezier(0.22,1.2,0.36,1)] group-hover:-rotate-6" />
            <span className="text-[19px] font-extrabold tracking-tight text-ink">PaperPal</span>
          </button>
          <nav className="flex items-center gap-1">
            <NavLink to="/tools" active={base === '/tools'}>
              Tools
            </NavLink>
            <NavLink to="/settings" active={base === '/settings'}>
              Settings
            </NavLink>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-16 pt-4 sm:px-6">
        <main className="flex-1">
          <ViewErrorBoundary resetKey={base}>
            <Suspense fallback={<ViewSkeleton />}>
              <div key={base} className="animate-enter">
                <View route={route} />
              </div>
            </Suspense>
          </ViewErrorBoundary>
        </main>
      </div>

      <SiteFooter />
      <PwaPrompt />
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-auto bg-recess">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <Pal className="h-7 w-7 text-brand" />
              <span className="text-[17px] font-extrabold tracking-tight text-ink">PaperPal</span>
            </div>
            <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-ink-dim">
              Every tool runs on your device. Nothing is uploaded, because there is
              nowhere to upload it to.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`${REPO}/issues/new`}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-full bg-page px-4 py-2.5 text-[14px] font-bold text-ink-dim shadow-sm transition-colors hover:text-ink"
            >
              Feedback
            </a>
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="PaperPal on GitHub"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-page text-ink-dim shadow-sm transition-colors hover:text-ink"
            >
              <IconGitHub className="h-[18px] w-[18px]" />
            </a>
          </div>
        </div>

        <p className="num mt-9 text-[12px] text-ink-dim">
          © 2026 Top Sortrakul · AGPL-3.0 · Built with Claude Code
        </p>
      </div>
    </footer>
  );
}
