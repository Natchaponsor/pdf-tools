import { IconLoader } from './icons';

/** Suspense fallback while a lazy view chunk loads. Shaped like a generic
 * tool screen so it doesn't flash an unrelated layout before the real one
 * mounts. */
export function ViewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <div className="skeleton h-4 w-20 rounded-lg" />
        <div className="skeleton h-9 w-56 rounded-lg" />
        <div className="skeleton h-4 w-72 max-w-full rounded-lg" />
      </div>
      <div className="skeleton flex h-56 items-center justify-center rounded-2xl">
        <IconLoader className="h-7 w-7 animate-spin text-ink-500/40 dark:text-white/25" />
      </div>
    </div>
  );
}
