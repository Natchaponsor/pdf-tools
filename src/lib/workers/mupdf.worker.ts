/*
 * MuPDF worker (bundled ES-module worker).
 *
 * Handles the lossless "Light" compression tier and, later, the structural
 * tools. The MuPDF WASM build is single-threaded, so no cross-origin isolation
 * is required. Vite rewrites mupdf.js's `new URL('mupdf-wasm.wasm', import.meta.url)`
 * to a hashed, base-path-aware asset URL at build time, so no loader override is
 * needed here.
 */

type Job = { id: number; op: 'compress-lossless'; file: ArrayBuffer };

self.onmessage = async (event: MessageEvent<Job>) => {
  const { id, op, file } = event.data;
  const started = performance.now();
  try {
    const mupdf = await import('mupdf');

    if (op === 'compress-lossless') {
      const doc = mupdf.Document.openDocument(new Uint8Array(file), 'application/pdf').asPDF();
      if (!doc) throw new Error('This file is not a PDF document.');
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
    }
  } catch (err) {
    self.postMessage({
      id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
