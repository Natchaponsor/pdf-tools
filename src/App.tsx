import { PRIVACY_LINE } from './lib/constants';
import { navigate, useHashRoute } from './lib/useHashRoute';
import { CompressPdf } from './views/CompressPdf';
import { SelfTest } from './views/SelfTest';

export function App() {
  const route = useHashRoute();

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-bold text-ink-900 dark:text-white"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M21 3 3 10.5l7 2.5 2 7 3-5.5 4 3z" />
            </svg>
          </span>
          Paperplane
        </button>
      </header>

      <main className="flex-1">
        {route.startsWith('/compress') ? (
          <CompressPdf />
        ) : route.startsWith('/selftest') ? (
          <SelfTest />
        ) : (
          <Home />
        )}
      </main>

      <footer className="mt-10 border-t border-paper-200 pt-4 text-center text-xs text-ink-500 dark:border-white/10 dark:text-white/50">
        {PRIVACY_LINE}
      </footer>
    </div>
  );
}

function Home() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Private PDF tools</h1>
        <p className="text-ink-500 dark:text-white/60">
          Everything runs in your browser. {PRIVACY_LINE}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate('/compress')}
        className="block w-full rounded-2xl border border-paper-200 bg-white p-5 text-left transition-colors hover:border-brand-300 dark:border-white/10 dark:bg-white/5"
      >
        <span className="block font-semibold text-ink-900 dark:text-white">Compress PDF</span>
        <span className="block text-sm text-ink-500 dark:text-white/60">
          Shrink a large PDF for email or upload.
        </span>
      </button>
      <p className="text-sm text-ink-500 dark:text-white/50">More tools are on the way.</p>
    </div>
  );
}
