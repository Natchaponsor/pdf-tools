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
  | { id: number; op: 'close'; docId: number }
  | { id: number; op: 'protect'; file: ArrayBuffer; password: string; permissions: number }
  | { id: number; op: 'unlock'; file: ArrayBuffer; password: string }
  | { id: number; op: 'extract-images'; file: ArrayBuffer };

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

      case 'protect': {
        const doc = mupdf.Document.openDocument(
          new Uint8Array(job.file),
          'application/pdf',
        ).asPDF() as PDFDocument | null;
        if (!doc) throw new Error('This file is not a PDF document.');
        if (doc.needsPassword()) {
          throw new Error('This PDF already has a password. Unlock it first, then re-protect it.');
        }
        const out = toArrayBuffer(
          doc
            .saveToBuffer({
              encrypt: 'aes-256',
              'user-password': job.password,
              'owner-password': job.password,
              permissions: job.permissions,
              compress: true,
            })
            .asUint8Array(),
        );
        doc.destroy();
        self.postMessage({ id, type: 'done', output: out, ms: performance.now() - started }, {
          transfer: [out],
        });
        return;
      }

      case 'unlock': {
        const doc = mupdf.Document.openDocument(new Uint8Array(job.file), 'application/pdf');
        if (!doc.needsPassword()) {
          throw new Error("This PDF isn't password-protected — there's nothing to unlock.");
        }
        if (!doc.authenticatePassword(job.password)) {
          throw new Error('That password is incorrect.');
        }
        const pdf = doc.asPDF() as PDFDocument | null;
        if (!pdf) throw new Error('This file is not a PDF document.');
        const out = toArrayBuffer(
          pdf.saveToBuffer({ encrypt: 'none', compress: true }).asUint8Array(),
        );
        doc.destroy();
        self.postMessage({ id, type: 'done', output: out, ms: performance.now() - started }, {
          transfer: [out],
        });
        return;
      }

      case 'extract-images': {
        const doc = mupdf.Document.openDocument(
          new Uint8Array(job.file),
          'application/pdf',
        ).asPDF() as PDFDocument | null;
        if (!doc) throw new Error('This file is not a PDF document.');
        if (doc.needsPassword()) throw new Error('This PDF is password-protected.');

        const pageCount = doc.countPages();
        const pagePad = String(pageCount).length;
        const seen = new Set<number>();
        const images: { name: string; bytes: ArrayBuffer }[] = [];

        for (let i = 0; i < pageCount; i++) {
          const page = doc.loadPage(i);
          const resources = page.getObject().getInheritable('Resources');
          const xobjects = resources && !resources.isNull() ? resources.get('XObject') : null;
          let onPage = 0;
          if (xobjects && !xobjects.isNull()) {
            xobjects.forEach((val) => {
              try {
                if (!val.isStream()) return;
                const subtype = val.get('Subtype');
                if (!subtype.isName() || subtype.asName() !== 'Image') return;
                const mask = val.get('ImageMask');
                if (mask.isBoolean() && mask.asBoolean()) return; // stencil mask, not a real image
                const ref = val.isIndirect() ? val.asIndirect() : -1;
                if (ref >= 0) {
                  if (seen.has(ref)) return;
                  seen.add(ref);
                }

                const filter = val.get('Filter');
                let filterName: string | null = null;
                if (filter.isName()) filterName = filter.asName();
                else if (filter.isArray() && filter.length > 0) {
                  const last = filter.get(filter.length - 1);
                  if (last.isName()) filterName = last.asName();
                }

                let bytes: Uint8Array;
                let ext: string;
                if (filterName === 'DCTDecode') {
                  // Already a JPEG stream — export the original bytes untouched.
                  bytes = val.readRawStream().asUint8Array();
                  ext = 'jpg';
                } else {
                  const pixmap = doc.loadImage(val).toPixmap();
                  bytes = pixmap.asPNG();
                  pixmap.destroy();
                  ext = 'png';
                }

                onPage++;
                const out = toArrayBuffer(bytes);
                images.push({
                  name: `p${String(i + 1).padStart(pagePad, '0')}-img${onPage}.${ext}`,
                  bytes: out,
                });
              } catch {
                /* skip images MuPDF can't decode rather than failing the whole export */
              }
            });
          }
          page.destroy();
        }
        doc.destroy();
        self.postMessage(
          { id, type: 'done', images, ms: performance.now() - started },
          { transfer: images.map((im) => im.bytes) },
        );
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
