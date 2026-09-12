import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { renderPageHiRes } from '../lib/pdfDoc';
import { IconClose, IconLoader } from './icons';

interface Props {
  file: File;
  pageIndex: number;
  rotationDeg?: number;
  onClose: () => void;
}

/** A bigger, higher-resolution look at one page, opened from any page-thumbnail tile. */
export function PageZoomModal({ file, pageIndex, rotationDeg = 0, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);
    renderPageHiRes(file, pageIndex)
      .then(({ blob }) => {
        if (cancelled) return;
        const next = URL.createObjectURL(blob);
        urlRef.current = next;
        setUrl(next);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load a bigger preview of this page.");
      });
    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [file, pageIndex]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <IconClose className="h-5 w-5" />
      </button>
      <div className="max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
        {url ? (
          <img
            src={url}
            alt={`Page ${pageIndex + 1}, full size`}
            className="max-h-[85vh] max-w-[90vw] rounded-lg bg-white object-contain shadow-2xl"
            style={{ transform: `rotate(${rotationDeg}deg)` }}
          />
        ) : error ? (
          <p className="rounded-lg bg-white px-6 py-4 text-sm text-red-600">{error}</p>
        ) : (
          <IconLoader className="h-10 w-10 animate-spin text-white/80" />
        )}
      </div>
    </div>,
    document.body,
  );
}
