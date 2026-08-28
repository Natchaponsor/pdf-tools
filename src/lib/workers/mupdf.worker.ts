/*
 * MuPDF worker (bundled ES-module worker).
 *
 * One engine for: the lossless "Light" compression tier, first-page previews,
 * page counts, and page rendering for the organize / PDF-to-image tools.
 * The MuPDF WASM build is single-threaded — no cross-origin isolation needed.
 * Vite rewrites mupdf.js's `new URL('mupdf-wasm.wasm', import.meta.url)` to a
 * hashed, base-path-aware asset URL, so no loader override is required.
 */
import type { PDFDocument, Document } from 'mupdf';

type Job =
  | { id: number; op: 'compress-lossless'; file: ArrayBuffer }
  | { id: number; op: 'render-first-page'; file: ArrayBuffer; maxWidth: number }
  | { id: number; op: 'open'; file: ArrayBuffer }
  | {
      id: number;
      op: 'render-page';
      docId: number;
      page: number;
      dpi?: number;
      maxWidth?: number;
      format: 'png' | 'jpeg';
      quality?: number;
    }
  | { id: number; op: 'close'; docId: number };

const openDocs = new Map<number, Document>();
let docSeq = 0;

type Mupdf = typeof import('mupdf');
let mupdfPromise: Promise<Mupdf> | null = null;
const getMupdf = () => (mupdfPromise ??= import('mupdf'));

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

self.onmessage = async (event: MessageEvent<Job>) => {
  const job = event.data;
  const { id } = job;
  const started = performance.now();
  try {
    const mupdf = await getMupdf();

    switch (job.op) {
      case 'compress-lossless': {
        const doc = mupdf.Document.openDocument(
          new Uint8Array(job.file),
          'application/pdf',
        ).asPDF() as PDFDocument | null;
        if (!doc) throw new Error('This file is not a PDF document.');
        if (doc.needsPassword()) throw new Error('This PDF is password-protected.');
        try {
          doc.subsetFonts();
        } catch {
          /* not all docs have subsettable fonts */
        }
        const out = toArrayBuffer(
          doc
            .saveToBuffer('compress,compress-images,compress-fonts,garbage=deduplicate,objstms')
            .asUint8Array(),
        );
        doc.destroy();
        self.postMessage({ id, type: 'done', output: out, ms: performance.now() - started }, {
          transfer: [out],
        });
        return;
      }

      case 'render-first-page': {
        const doc = mupdf.Document.openDocument(new Uint8Array(job.file), 'application/pdf');
        if (doc.needsPassword()) throw new Error('This PDF is password-protected.');
        const out = renderToJpeg(mupdf, doc, 0, { maxWidth: job.maxWidth, quality: 72 });
        doc.destroy();
        self.postMessage({ id, type: 'done', ...out, ms: performance.now() - started }, {
          transfer: [out.output],
        });
        return;
      }

      case 'open': {
        const doc = mupdf.Document.openDocument(new Uint8Array(job.file), 'application/pdf');
        if (doc.needsPassword()) throw new Error('This PDF is password-protected.');
        const docId = ++docSeq;
        openDocs.set(docId, doc);
        self.postMessage({ id, type: 'done', docId, pageCount: doc.countPages() });
        return;
      }

      case 'render-page': {
        const doc = openDocs.get(job.docId);
        if (!doc) throw new Error('Document is no longer open.');
        const out =
          job.format === 'png'
            ? renderToPng(mupdf, doc, job.page, job)
            : renderToJpeg(mupdf, doc, job.page, {
                dpi: job.dpi,
                maxWidth: job.maxWidth,
                quality: job.quality ?? 85,
              });
        self.postMessage({ id, type: 'done', ...out }, { transfer: [out.output] });
        return;
      }

      case 'close': {
        openDocs.get(job.docId)?.destroy();
        openDocs.delete(job.docId);
        self.postMessage({ id, type: 'done' });
        return;
      }
    }
  } catch (err) {
    self.postMessage({
      id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

function scaleFor(
  mupdf: Mupdf,
  doc: Document,
  page: number,
  opts: { dpi?: number; maxWidth?: number },
) {
  const p = doc.loadPage(page);
  const bounds = p.getBounds();
  const widthPt = Math.max(1, bounds[2] - bounds[0]);
  const scale = opts.dpi
    ? opts.dpi / 72
    : Math.min(3, Math.max(0.1, (opts.maxWidth ?? 160) / widthPt));
  return { p, matrix: mupdf.Matrix.scale(scale, scale) };
}

function renderToJpeg(
  mupdf: Mupdf,
  doc: Document,
  page: number,
  opts: { dpi?: number; maxWidth?: number; quality: number },
) {
  const { p, matrix } = scaleFor(mupdf, doc, page, opts);
  const pixmap = p.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
  const bytes = pixmap.asJPEG(opts.quality, false);
  const result = { output: toArrayBuffer(bytes), width: pixmap.getWidth(), height: pixmap.getHeight() };
  pixmap.destroy();
  p.destroy();
  return result;
}

function renderToPng(
  mupdf: Mupdf,
  doc: Document,
  page: number,
  opts: { dpi?: number; maxWidth?: number },
) {
  const { p, matrix } = scaleFor(mupdf, doc, page, opts);
  const pixmap = p.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
  const bytes = pixmap.asPNG();
  const result = { output: toArrayBuffer(bytes), width: pixmap.getWidth(), height: pixmap.getHeight() };
  pixmap.destroy();
  p.destroy();
  return result;
}
