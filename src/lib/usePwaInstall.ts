import { useCallback, useEffect, useState } from 'react';

/**
 * Install affordance state for the PWA.
 *
 * - `installable` — Chrome/Edge/Android fired `beforeinstallprompt`; call
 *   `promptInstall()` to show the native dialog.
 * - `ios-hint` — iOS Safari has no prompt event; show a one-line
 *   "Add to Home Screen" tip instead.
 * - `installed` — already running as a standalone app.
 * - `unsupported` — nothing to show (e.g. desktop Firefox).
 */
export type InstallState =
  | { kind: 'unsupported' }
  | { kind: 'installed' }
  | { kind: 'ios-hint' }
  | { kind: 'installable'; promptInstall: () => void };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ presents a desktop UA; fall back to a touch-capable Mac.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function usePwaInstall(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(() => {
    if (!deferred) return;
    void deferred.prompt();
    void deferred.userChoice.finally(() => setDeferred(null));
  }, [deferred]);

  if (installed) return { kind: 'installed' };
  if (deferred) return { kind: 'installable', promptInstall };
  if (isIos()) return { kind: 'ios-hint' };
  return { kind: 'unsupported' };
}
