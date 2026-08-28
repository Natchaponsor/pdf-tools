import { useSyncExternalStore } from 'react';

/**
 * Minimal hash-based routing. GitHub Pages has no server rewrites, so the app
 * lives entirely at index.html and the route is whatever follows '#/'.
 */
function currentRoute(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash.startsWith('/') ? hash : '/';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useHashRoute(): string {
  return useSyncExternalStore(subscribe, currentRoute, () => '/');
}

export function navigate(path: string): void {
  window.location.hash = path;
}
