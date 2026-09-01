import { callMupdf } from './mupdfClient';

export interface ExtractedImage {
  name: string;
  blob: Blob;
}

/**
 * Pull every embedded raster out of a PDF. JPEGs (DCTDecode) are returned as
 * their original bytes untouched; everything else is decoded and re-encoded
 * as PNG. Stencil image masks are skipped — they aren't standalone images.
 */
export async function extractImages(file: File): Promise<ExtractedImage[]> {
  const buffer = await file.arrayBuffer();
  const res = await callMupdf({ op: 'extract-images', file: buffer }, [buffer]);
  const images = res.images as { name: string; bytes: ArrayBuffer }[];
  return images.map((im) => ({
    name: im.name,
    blob: new Blob([im.bytes], { type: im.name.endsWith('.png') ? 'image/png' : 'image/jpeg' }),
  }));
}
