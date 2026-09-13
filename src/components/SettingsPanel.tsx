import { useEffect, useRef } from 'react';
import { SettingsBody } from '../views/Settings';
import { IconClose } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Settings as a drawer on the right, for screens wide enough to show the page
 * beside it.
 *
 * The point of the drawer is that the page stays visible while you change the
 * theme, so there is deliberately no dimming scrim. The backdrop exists only to
 * catch a click outside, and it is fully transparent.
 */
export function SettingsPanel({ open, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement;
    panel.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const back = restoreTo.current;
      if (back instanceof HTMLElement) back.focus();
    };
  }, [open, onClose]);

  return (
    <>
      {/* Transparent on purpose: dimming the page would hide the thing the
          theme change is meant to be judged against. */}
      <div
        className={`fixed inset-0 z-40 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="false"
        aria-label="Settings"
        tabIndex={-1}
        inert={!open}
        className={`fixed right-0 top-0 z-50 flex h-dvh w-[400px] max-w-[90vw] flex-col border-l border-line bg-page shadow-[-18px_0_48px_-28px_rgba(15,20,32,0.35)] outline-none transition-transform duration-300 ease-[cubic-bezier(0.22,1.2,0.36,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h2 className="text-[20px] font-extrabold tracking-tight text-ink">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-dim transition-colors hover:bg-sunk hover:text-ink"
          >
            <IconClose className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <SettingsBody />
        </div>
      </div>
    </>
  );
}
