/*
 * PDF page reading/rendering via the shared MuPDF worker (see mupdfClient.ts).
 * Replaces a pdf.js dependency — MuPDF is already loaded for compression and
 * renders pages reliably in the worker.
 */
import { callMupdf } from './mupdfClient';

export type RasterFormat = 'png' | 'jpeg';

export interface OpenDoc {
  docId: number;
  pageCount: number;
  close: () => void;
}

/** Open a document in the worker; remember to call `.close()` when done. */
export async function openDoc(file: File | ArrayBuffer): Promise<OpenDoc> {
  const buffer = file instanceof ArrayBuffer ? file.slice(0) : await file.arrayBuffer();
  const res = await callMupdf({ op: 'open', file: buffer }, [buffer]);
  const docId = res.docId as number;
  return {
    docId,
    pageCount: res.pageCount as number,
    close: () => void callMupdf({ op: 'close', docId }).catch(() => {}),
  };
}

export async function getPageCount(file: File): Promise<number> {
  const doc = await openDoc(file);
  doc.close();
  return doc.pageCount;
}

export interface RenderedPage {
  blob: Blob;
  width: number;
  height: number;
}

/** Render one page (0-based) of an already-open document. */
export async function renderPage(
  docId: number,
  page: number,
  opts: { dpi?: number; maxWidth?: number; format: RasterFormat; quality?: number },
): Promise<RenderedPage> {
  const res = await callMupdf({ op: 'render-page', docId, page, ...opts });
  return {
    blob: new Blob([res.output as ArrayBuffer], {
      type: opts.format === 'png' ? 'image/png' : 'image/jpeg',
    }),
    width: res.width as number,
    height: res.height as number,
  };
}

/** Render page 1 of a standalone PDF blob — used for result previews. */
export async function renderFirstPage(
  source: Blob | ArrayBuffer,
  maxWidth = 360,
): Promise<RenderedPage> {
  const buffer = source instanceof Blob ? await source.arrayBuffer() : source.slice(0);
  const res = await callMupdf({ op: 'render-first-page', file: buffer, maxWidth }, [buffer]);
  return {
    blob: new Blob([res.output as ArrayBuffer], { type: 'image/jpeg' }),
    width: res.width as number,
    height: res.height as number,
  };
}
