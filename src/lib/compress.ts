/*
 * PDF compression — engine selection and worker orchestration.
 *
 * Benchmarked on a 44.9 MB / 24-page scanned PDF (see README):
 *   light     MuPDF lossless structural  ~0–15%   keeps text, instant
 *   balanced  Ghostscript /ebook  (150dpi)  ~95%  keeps vector text
 *   maximum   Ghostscript /screen (72dpi)   ~97%  keeps vector text
 */
import { callMupdf } from './mupdfClient';
import { runGhostscript } from './ghostscript';

export type CompressLevel = 'light' | 'balanced' | 'maximum';

export interface CompressLevelInfo {
  id: CompressLevel;
  label: string;
  blurb: string;
  engine: 'mupdf' | 'ghostscript';
}

export const COMPRESS_LEVELS: CompressLevelInfo[] = [
  {
    id: 'light',
    label: 'Light',
    blurb: 'Lossless clean-up. Keeps full quality and selectable text. Best for PDFs that are mostly text.',
    engine: 'mupdf',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    blurb: 'Downsamples images to 150 DPI. Big size drop, still sharp on screen. Best for scans and photo-heavy PDFs.',
    engine: 'ghostscript',
  },
  {
    id: 'maximum',
    label: 'Smallest',
    blurb: 'Downsamples images to 72 DPI. Smallest possible file, fine for quick sharing and email.',
    engine: 'ghostscript',
  },
];

const GS_ARGS: Record<Exclude<CompressLevel, 'light'>, string[]> = {
  balanced: ['-dPDFSETTINGS=/ebook'],
  maximum: ['-dPDFSETTINGS=/screen'],
};

export interface CompressProgress {
  ratio: number | null;
  note: string;
}

export interface CompressOutcome {
  blob: Blob;
  outputBytes: number;
  ms: number;
}

export async function compressPdf(
  file: File,
  level: CompressLevel,
  onProgress: (p: CompressProgress) => void,
): Promise<CompressOutcome> {
  const buffer = await file.arrayBuffer();

  if (level === 'light') {
    onProgress({ ratio: null, note: 'Cleaning up the document…' });
    const data = await callMupdf({ op: 'compress-lossless', file: buffer }, [buffer]);
    const output = data.output as ArrayBuffer;
    return {
      blob: new Blob([output], { type: 'application/pdf' }),
      outputBytes: output.byteLength,
      ms: data.ms as number,
    };
  }
  return runGhostscript(buffer, GS_ARGS[level], onProgress, 'Compressing');
}
