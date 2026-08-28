/*
 * Structural PDF edits with pdf-lib. These run on the main thread — merge,
 * split, and text stamping are fast even for large documents, and the heavy
 * work (compression, rendering) already lives in workers.
 */
import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';

export type RotationAngle = 0 | 90 | 180 | 270;

async function load(file: File | ArrayBuffer): Promise<PDFDocument> {
  const bytes = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  try {
    return await PDFDocument.load(bytes);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/encrypt/i.test(message)) {
      throw new Error('This PDF is password-protected. Remove the password first.');
    }
    throw new Error('This PDF could not be read — it may be damaged.');
  }
}

export async function getPageCount(file: File): Promise<number> {
  return (await load(file)).getPageCount();
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const file of files) {
    const src = await load(file);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

/** Parenthesis-free page range spec like "1-3, 5, 8-10" → zero-based indices. */
export function parsePageRanges(spec: string, pageCount: number): number[] {
  const indices: number[] = [];
  for (const chunk of spec.split(',')) {
    const part = chunk.trim();
    if (!part) continue;
    const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) throw new Error(`"${part}" isn't a valid page or range.`);
    const start = Number(m[1]);
    const end = m[2] ? Number(m[2]) : start;
    if (start < 1 || end > pageCount || start > end) {
      throw new Error(`"${part}" is outside 1–${pageCount}.`);
    }
    for (let p = start; p <= end; p++) indices.push(p - 1);
  }
  if (!indices.length) throw new Error('Enter at least one page.');
  return indices;
}

export async function extractPages(file: File, indices: number[]): Promise<Uint8Array> {
  const src = await load(file);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

export interface SplitFile {
  name: string;
  bytes: Uint8Array;
}

export async function splitToSinglePages(file: File): Promise<SplitFile[]> {
  const src = await load(file);
  const base = file.name.replace(/\.pdf$/i, '');
  const count = src.getPageCount();
  const pad = String(count).length;
  const results: SplitFile[] = [];
  for (let i = 0; i < count; i++) {
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(src, [i]);
    out.addPage(page);
    results.push({
      name: `${base}-p${String(i + 1).padStart(pad, '0')}.pdf`,
      bytes: await out.save(),
    });
  }
  return results;
}

export interface PageOp {
  /** Original zero-based index in the source document. */
  index: number;
  rotate: RotationAngle;
}

/** Rebuild a document from a reordered / rotated / filtered page list. */
export async function organizePages(file: File, ops: PageOp[]): Promise<Uint8Array> {
  if (!ops.length) throw new Error('Keep at least one page.');
  const src = await load(file);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    ops.map((o) => o.index),
  );
  copied.forEach((page, i) => {
    const extra = ops[i].rotate;
    if (extra) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + extra) % 360));
    }
    out.addPage(page);
  });
  return out.save();
}

export interface ImagesToPdfOptions {
  pageSize: 'fit' | 'a4' | 'letter';
  margin: number;
}

const PAGE_DIMS = {
  a4: [595.28, 841.89],
  letter: [612, 792],
} as const;

export async function imagesToPdf(
  files: File[],
  opts: ImagesToPdfOptions,
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
    const image = isPng ? await out.embedPng(bytes) : await out.embedJpg(bytes);

    if (opts.pageSize === 'fit') {
      const page = out.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      continue;
    }

    const [pw, ph] = PAGE_DIMS[opts.pageSize];
    const page = out.addPage([pw, ph]);
    const box = { w: pw - opts.margin * 2, h: ph - opts.margin * 2 };
    const scale = Math.min(box.w / image.width, box.h / image.height, 1);
    const w = image.width * scale;
    const h = image.height * scale;
    page.drawImage(image, {
      x: (pw - w) / 2,
      y: (ph - h) / 2,
      width: w,
      height: h,
    });
  }
  if (!out.getPageCount()) throw new Error('No images to add.');
  return out.save();
}

export type Corner =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface PageNumberOptions {
  position: Corner;
  fontSize: number;
  margin: number;
  startAt: number;
  format: 'n' | 'n-of-total' | 'page-n';
}

function placeInCorner(
  page: PDFPage,
  textWidth: number,
  fontSize: number,
  position: Corner,
  margin: number,
): { x: number; y: number } {
  const { width, height } = page.getSize();
  const [v, h] = position.split('-');
  const y = v === 'top' ? height - margin - fontSize : margin;
  const x =
    h === 'left' ? margin : h === 'right' ? width - margin - textWidth : (width - textWidth) / 2;
  return { x, y };
}

export async function addPageNumbers(
  file: File,
  opts: PageNumberOptions,
): Promise<Uint8Array> {
  const doc = await load(file);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const n = opts.startAt + i;
    const label =
      opts.format === 'n-of-total'
        ? `${n} / ${opts.startAt + pages.length - 1}`
        : opts.format === 'page-n'
          ? `Page ${n}`
          : `${n}`;
    const textWidth = font.widthOfTextAtSize(label, opts.fontSize);
    const { x, y } = placeInCorner(page, textWidth, opts.fontSize, opts.position, opts.margin);
    page.drawText(label, { x, y, size: opts.fontSize, font, color: rgb(0.1, 0.1, 0.1) });
  });
  return doc.save();
}

export interface WatermarkOptions {
  text: string;
  opacity: number;
  fontSize: number;
  layout: 'diagonal' | 'horizontal';
  color: [number, number, number];
}

export async function addWatermark(
  file: File,
  opts: WatermarkOptions,
): Promise<Uint8Array> {
  if (!opts.text.trim()) throw new Error('Enter watermark text.');
  const doc = await load(file);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const angleDeg = opts.layout === 'diagonal' ? 45 : 0;
  const angleRad = (angleDeg * Math.PI) / 180;

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(opts.text, opts.fontSize);
    const cx = width / 2;
    const cy = height / 2;
    const x = cx - (textWidth / 2) * Math.cos(angleRad);
    const y = cy - (textWidth / 2) * Math.sin(angleRad) - opts.fontSize / 2;
    page.drawText(opts.text, {
      x,
      y,
      size: opts.fontSize,
      font,
      color: rgb(...opts.color),
      opacity: opts.opacity,
      rotate: degrees(angleDeg),
    });
  }
  return doc.save();
}

export type { PDFFont };
