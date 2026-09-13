/*
 * PDF page reading/rendering via the shared MuPDF worker (see mupdfClient.ts).
 * Replaces a pdf.js dependency, since MuPDF is already loaded for compression and
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

/** Render page 1 of a standalone PDF blob, used for result previews. */
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

/** Render one page of a standalone file at higher resolution, for a zoomed preview. */
export async function renderPageHiRes(
  file: File,
  page: number,
  opts?: { dpi?: number; format?: RasterFormat; quality?: number },
): Promise<RenderedPage> {
  const doc = await openDoc(file);
  try {
    return await renderPage(doc.docId, page, {
      dpi: opts?.dpi ?? 300,
      format: opts?.format ?? 'jpeg',
      quality: opts?.quality ?? 90,
    });
  } finally {
    doc.close();
  }
}

export interface ExportedImage {
  name: string;
  blob: Blob;
}

/** Render every page of a PDF blob to images, used to offer JPG/PNG at export time. */
export async function convertPdfToImages(
  blob: Blob,
  format: RasterFormat,
  baseName: string,
  opts?: { dpi?: number; quality?: number },
): Promise<ExportedImage[]> {
  const buffer = await blob.arrayBuffer();
  const doc = await openDoc(buffer);
  try {
    const ext = format === 'png' ? 'png' : 'jpg';
    const pad = String(doc.pageCount).length;
    const images: ExportedImage[] = [];
    for (let i = 0; i < doc.pageCount; i++) {
      const { blob: pageBlob } = await renderPage(doc.docId, i, {
        dpi: opts?.dpi ?? 150,
        format,
        quality: opts?.quality,
      });
      images.push({ name: `${baseName}-p${String(i + 1).padStart(pad, '0')}.${ext}`, blob: pageBlob });
    }
    return images;
  } finally {
    doc.close();
  }
}
