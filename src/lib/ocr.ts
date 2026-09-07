/*
 * OCR — makes scanned PDFs searchable, entirely on the device.
 *
 * MuPDF (shared worker) rasterises each page; Tesseract.js (its own worker)
 * recognises the text and returns a 1-page PDF with an invisible text layer
 * over the image; pdf-lib stitches the pages back into one searchable PDF.
 *
 * Tesseract's worker script, WebAssembly core and language model are all
 * self-hosted under /vendor/tesseract (copied by scripts/sync-vendor.mjs) and
 * pointed at explicitly below — tesseract.js would otherwise fetch them from a
 * CDN, which would break the "nothing leaves your device" guarantee. The
 * service worker runtime-caches them on first use (see vite.config.ts).
 */
import { createWorker, OEM } from 'tesseract.js';
import { PDFDocument } from 'pdf-lib';
import { openDoc, renderPage } from './pdfDoc';
import { bytesToBlob } from './download';

const TESS = `${import.meta.env.BASE_URL}vendor/tesseract`;

export const OCR_LANGS = [{ code: 'eng', label: 'English' }] as const;
export type OcrLang = (typeof OCR_LANGS)[number]['code'];

export const OCR_QUALITY = [
  { id: 'balanced', label: 'Faster (150 dpi)', dpi: 150 },
  { id: 'standard', label: 'Standard (200 dpi)', dpi: 200 },
  { id: 'high', label: 'Best (300 dpi)', dpi: 300 },
] as const;
export type OcrQuality = (typeof OCR_QUALITY)[number]['id'];

export interface OcrProgress {
  ratio: number | null;
  note: string;
}

export interface OcrResult {
  pdf: Blob;
  text: string;
  pageCount: number;
  ms: number;
}

function humanStatus(status: string): string {
  if (status.includes('core')) return 'Loading the OCR engine…';
  if (status.includes('traineddata') || status.includes('language')) {
    return 'Loading the language model…';
  }
  if (status.includes('initiali')) return 'Starting the OCR engine…';
  return 'Preparing…';
}

export async function runOcr(
  file: File,
  opts: { lang: OcrLang; quality: OcrQuality; onProgress: (p: OcrProgress) => void },
): Promise<OcrResult> {
  const started = performance.now();
  const dpi = OCR_QUALITY.find((q) => q.id === opts.quality)?.dpi ?? 200;
  const doc = await openDoc(file);

  try {
    const total = doc.pageCount;
    if (total === 0) throw new Error('This PDF has no pages.');

    opts.onProgress({ ratio: null, note: 'Loading the OCR engine…' });
    const worker = await createWorker(opts.lang, OEM.LSTM_ONLY, {
      workerPath: `${TESS}/worker.min.js`,
      corePath: TESS,
      langPath: `${TESS}/tessdata`,
      gzip: true,
      cacheMethod: 'none',
      legacyCore: false,
      legacyLang: false,
      // Load the worker straight from its same-origin URL rather than a blob:
      // URL. A blob: worker is not controlled by the service worker, so its
      // own fetches (the WASM core, the language model) would bypass the
      // offline cache. A real same-origin worker script is SW-controlled.
      workerBlobURL: false,
      logger: (m) => {
        if (m.status && m.status !== 'recognizing text') {
          opts.onProgress({ ratio: null, note: humanStatus(m.status) });
        }
      },
    });

    try {
      const pagePdfs: Uint8Array[] = [];
      const texts: string[] = [];

      for (let i = 0; i < total; i++) {
        const page = await renderPage(doc.docId, i, { dpi, format: 'png' });
        const { data } = await worker.recognize(
          page.blob,
          { rotateAuto: true },
          { pdf: true, text: true },
        );
        pagePdfs.push(Uint8Array.from(data.pdf ?? []));
        texts.push((data.text ?? '').trim());
        opts.onProgress({
          ratio: (i + 1) / total,
          note:
            total === 1 ? 'Recognised the page' : `Recognised page ${i + 1} of ${total}`,
        });
      }

      await worker.terminate();

      opts.onProgress({ ratio: null, note: 'Assembling the searchable PDF…' });
      const merged = await PDFDocument.create();
      for (const bytes of pagePdfs) {
        if (!bytes.length) continue;
        const part = await PDFDocument.load(bytes);
        const copied = await merged.copyPages(part, part.getPageIndices());
        copied.forEach((p) => merged.addPage(p));
      }
      const out = await merged.save();

      return {
        pdf: bytesToBlob(out, 'application/pdf'),
        text: texts.filter(Boolean).join('\n\n'),
        pageCount: total,
        ms: performance.now() - started,
      };
    } catch (err) {
      await worker.terminate().catch(() => {});
      throw err;
    }
  } finally {
    doc.close();
  }
}
