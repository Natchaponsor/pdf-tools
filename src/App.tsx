import { lazy, Suspense, type ComponentType } from 'react';
import { PRIVACY_LINE } from './lib/constants';
import { navigate, useHashRoute } from './lib/useHashRoute';
import { toolByRoute } from './data/tools';
import { TabBar } from './components/TabBar';
import { Home } from './views/Home';

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

export function App() {
  const route = useHashRoute();
  const inTool = toolByRoute(route) != null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pb-24 pt-5 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
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
        {!inTool && (
          <span className="hidden text-xs text-ink-500 sm:block dark:text-white/50">
            {PRIVACY_LINE}
          </span>
        )}
      </header>

      <main className="flex-1">
        <Suspense fallback={<p className="py-10 text-center text-sm text-ink-500">Loading…</p>}>
          <View route={route} />
        </Suspense>
      </main>

      <footer className="mt-10 border-t border-paper-200 pt-4 text-center text-xs text-ink-500 dark:border-white/10 dark:text-white/50">
        {PRIVACY_LINE}
      </footer>

      <TabBar route={route} />
    </div>
  );
}
