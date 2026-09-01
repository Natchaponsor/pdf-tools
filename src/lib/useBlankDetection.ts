import { useEffect, useState } from 'react';
import type { PageThumb } from './usePageThumbnails';

/** Fraction of non-near-white pixels below which a page counts as blank. */
const INK_THRESHOLD = 0.005;

/**
 * Flags pages that look empty by sampling their thumbnail on a canvas — cheap
 * because thumbnails are already small JPEGs. Runs on the main thread; no
 * worker needed for images this size. This is a first pass for review, not a
 * silent auto-remove — the caller always shows the result before acting.
 *
 * Pass an empty array while thumbnails are still loading; pass the full list
 * once they're all ready, and the hook analyses them progressively.
 */
export function useBlankDetection(pages: PageThumb[]): {
  blank: Record<number, boolean>;
  analyzing: boolean;
} {
  const [blank, setBlank] = useState<Record<number, boolean>>({});
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (pages.length === 0) {
      setBlank((b) => (Object.keys(b).length ? {} : b));
      setAnalyzing((a) => (a ? false : a));
      return;
    }

    let cancelled = false;
    setAnalyzing(true);
    (async () => {
      const found: Record<number, boolean> = {};
      for (const page of pages) {
        if (cancelled) return;
        try {
          found[page.index] = await isPageBlank(page.url);
        } catch {
          // Couldn't analyze it — leave it unflagged rather than guess.
        }
        if (!cancelled) setBlank({ ...found });
      }
      if (!cancelled) setAnalyzing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [pages]);

  return { blank, analyzing };
}

async function isPageBlank(url: string): Promise<boolean> {
  const blob = await (await fetch(url)).blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    return false;
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let ink = 0;
  const total = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const luma = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (luma < 235) ink++;
  }
  return ink / total < INK_THRESHOLD;
}
