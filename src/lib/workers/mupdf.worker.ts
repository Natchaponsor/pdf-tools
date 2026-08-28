/*
 * MuPDF worker (bundled ES-module worker).
 *
 * Handles the lossless "Light" compression tier, first-page previews, and
 * (later) the structural tools. The MuPDF WASM build is single-threaded, so no
 * cross-origin isolation is required. Vite rewrites mupdf.js's
 * `new URL('mupdf-wasm.wasm', import.meta.url)` to a hashed, base-path-aware
 * asset URL at build time, so no loader override is needed here.
 */

type Job =
  | { id: number; op: 'compress-lossless'; file: ArrayBuffer }
  | { id: number; op: 'render-first-page'; file: ArrayBuffer; maxWidth: number };

self.onmessage = async (event: MessageEvent<Job>) => {
  const { id, op } = event.data;
  const started = performance.now();
  try {
    const mupdf = await import('mupdf');

    if (op === 'compress-lossless') {
      const doc = mupdf.Document.openDocument(
        new Uint8Array(event.data.file),
        'application/pdf',
      ).asPDF();
      if (!doc) throw new Error('This file is not a PDF document.');
      if (doc.needsPassword()) throw new Error('This PDF is password-protected.');
      try {
        doc.subsetFonts();
      } catch {
        // Not fatal — some documents have no subsettable fonts.
      }
      const buf = doc.saveToBuffer(
        'compress,compress-images,compress-fonts,garbage=deduplicate,objstms',
      );
      const bytes = buf.asUint8Array();
      const output = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      doc.destroy();
      self.postMessage(
        { id, type: 'done', output, ms: performance.now() - started },
        { transfer: [output] },
      );
      return;
    }

    if (op === 'render-first-page') {
      const doc = mupdf.Document.openDocument(
        new Uint8Array(event.data.file),
        'application/pdf',
      );
      if (doc.needsPassword()) throw new Error('This PDF is password-protected.');
      const page = doc.loadPage(0);
      const bounds = page.getBounds();
      const widthPt = Math.max(1, bounds[2] - bounds[0]);
      const scale = Math.min(3, Math.max(0.2, event.data.maxWidth / widthPt));
      const pixmap = page.toPixmap(
        mupdf.Matrix.scale(scale, scale),
        mupdf.ColorSpace.DeviceRGB,
        false,
      );
      // JPEG keeps the preview small (it's a thumbnail, not the deliverable).
      const jpeg = pixmap.asJPEG(72, false);
      const output = jpeg.buffer.slice(
        jpeg.byteOffset,
        jpeg.byteOffset + jpeg.byteLength,
      ) as ArrayBuffer;
      const width = pixmap.getWidth();
      const height = pixmap.getHeight();
      pixmap.destroy();
      page.destroy();
      doc.destroy();
      self.postMessage(
        { id, type: 'done', output, width, height, ms: performance.now() - started },
        { transfer: [output] },
      );
      return;
    }
  } catch (err) {
    self.postMessage({
      id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
