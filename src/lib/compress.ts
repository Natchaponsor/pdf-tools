/*
 * PDF compression — engine selection and worker orchestration.
 *
 * Benchmarked on a 44.9 MB / 24-page scanned PDF (see README):
 *   light     MuPDF lossless structural  ~0–15%   keeps text, instant
 *   balanced  Ghostscript /ebook  (150dpi)  ~95%  keeps vector text
 *   maximum   Ghostscript /screen (72dpi)   ~97%  keeps vector text
 */

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
  /** 0–1 when known, otherwise null (indeterminate). */
  ratio: number | null;
  note: string;
}

export interface CompressOutcome {
  blob: Blob;
  outputBytes: number;
  ms: number;
}

export interface PageImage {
  blob: Blob;
  width: number;
  height: number;
}

let mupdfWorker: Worker | null = null;
function getMupdfWorker(): Worker {
  mupdfWorker ??= new Worker(new URL('./workers/mupdf.worker.ts', import.meta.url), {
    type: 'module',
  });
  return mupdfWorker;
}

let jobId = 0;

/** One-shot request/response against the shared MuPDF worker. */
function callMupdf(
  payload: Record<string, unknown>,
  transfer: Transferable[],
): Promise<Record<string, unknown>> {
  const worker = getMupdfWorker();
  const id = ++jobId;
  return new Promise((resolve, reject) => {
    const handle = (event: MessageEvent) => {
      const data = event.data;
      if (data.id !== id) return;
      cleanup();
      if (data.type === 'done') resolve(data);
      else reject(new Error(data.message ?? 'MuPDF worker error'));
    };
    const onErr = () => {
      cleanup();
      reject(new Error('The PDF engine failed to load.'));
    };
    function cleanup() {
      worker.removeEventListener('message', handle);
      worker.removeEventListener('error', onErr);
    }
    worker.addEventListener('message', handle);
    worker.addEventListener('error', onErr);
    worker.postMessage({ id, ...payload }, transfer);
  });
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
  return runGhostscript(++jobId, buffer, GS_ARGS[level], onProgress);
}

/** Render page 1 of a PDF to a PNG, for a visual "is this the right file?" check. */
export async function renderFirstPage(
  source: Blob | ArrayBuffer,
  maxWidth = 360,
): Promise<PageImage> {
  const buffer = source instanceof Blob ? await source.arrayBuffer() : source.slice(0);
  const data = await callMupdf({ op: 'render-first-page', file: buffer, maxWidth }, [buffer]);
  return {
    blob: new Blob([data.output as ArrayBuffer], { type: 'image/jpeg' }),
    width: data.width as number,
    height: data.height as number,
  };
}

function runGhostscript(
  id: number,
  buffer: ArrayBuffer,
  args: string[],
  onProgress: (p: CompressProgress) => void,
): Promise<CompressOutcome> {
  // A fresh worker each run — Ghostscript keeps a lot of state and memory.
  const worker = new Worker(`${import.meta.env.BASE_URL}workers/gs.worker.js`);
  onProgress({ ratio: null, note: 'Loading the compression engine…' });

  // Ghostscript's per-page output doesn't stream reliably from WASM, so show a
  // gentle elapsed-time hint once the engine is up.
  const start = performance.now();
  let ticking = false;
  const tick = setInterval(() => {
    if (!ticking) return;
    const s = Math.round((performance.now() - start) / 1000);
    onProgress({ ratio: null, note: `Compressing… ${s}s elapsed` });
  }, 1000);

  return new Promise((resolve, reject) => {
    const handle = (event: MessageEvent) => {
      const data = event.data;
      if (data.id !== id) return;
      if (data.type === 'progress') {
        ticking = true;
        const ratio = data.pages ? data.page / data.pages : null;
        onProgress({
          ratio,
          note: data.pages
            ? `Compressing page ${data.page} of ${data.pages}…`
            : `Compressing… ${Math.round((performance.now() - start) / 1000)}s elapsed`,
        });
      } else if (data.type === 'done') {
        cleanup();
        resolve({
          blob: new Blob([data.output], { type: 'application/pdf' }),
          outputBytes: data.output.byteLength,
          ms: data.ms,
        });
      } else if (data.type === 'error') {
        cleanup();
        reject(new Error(data.message));
      }
    };
    const onErr = () => {
      cleanup();
      reject(new Error('The compression engine failed to load.'));
    };
    function cleanup() {
      clearInterval(tick);
      worker.removeEventListener('message', handle);
      worker.removeEventListener('error', onErr);
      worker.terminate();
    }
    worker.addEventListener('message', handle);
    worker.addEventListener('error', onErr);
    worker.postMessage({ id, file: buffer, args }, [buffer]);
  });
}
