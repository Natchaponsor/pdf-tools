import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Bottom-centre toast for service-worker lifecycle events.
 *
 * - "Update available, reload" when a new deploy has been fetched
 *   (`registerType: 'prompt'`, so nothing swaps until the user clicks).
 * - "Ready to work offline" once, on first install of the worker.
 */
export function PwaPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  const dismiss = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
    >
      <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-paper-200 bg-white p-3 shadow-lg dark:border-white/15 dark:bg-[#161b26]">
        <p className="flex-1 text-sm text-ink-700 dark:text-white/80">
          {needRefresh ? 'A new version is available.' : 'Ready to work offline.'}
        </p>
        {needRefresh && (
          <button
            type="button"
            onClick={() => void updateServiceWorker()}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Reload
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-lg px-2 py-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900 dark:text-white/60 dark:hover:text-white"
        >
          {needRefresh ? 'Later' : 'Dismiss'}
        </button>
      </div>
    </div>
  );
}
