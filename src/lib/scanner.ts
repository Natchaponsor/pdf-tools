/*
 * Document scanner: auto edge detection + perspective "flatten", on-device.
 *
 * OpenCV.js (self-hosted at /vendor/opencv/opencv.js, ~13 MB, WASM embedded) is
 * loaded lazily the first time a page is captured and then cached by the
 * service worker. The corner-detection approach follows jscanify (MIT):
 * Canny → blur → contours → largest 4-point polygon.
 */

// OpenCV.js ships no usable types for this UMD build, so `cv` is dynamically typed.
type Cv = Record<string, any>;

const CV_URL = `${import.meta.env.BASE_URL}vendor/opencv/opencv.js`;

let cvPromise: Promise<Cv> | null = null;

export function loadCv(): Promise<Cv> {
  if (cvPromise) return cvPromise;
  cvPromise = new Promise<Cv>((resolve, reject) => {
    const g = globalThis as { cv?: unknown };
    const asCv = (v: unknown) => v as Cv;
    if (asCv(g.cv)?.Mat) return resolve(asCv(g.cv));

    const script = document.createElement('script');
    script.src = CV_URL;
    script.async = true;
    script.onload = async () => {
      try {
        const raw = g.cv;
        const mod: Cv =
          raw && typeof (raw as { then?: unknown }).then === 'function'
            ? await (raw as Promise<Cv>)
            : asCv(raw);
        if (!mod?.Mat) throw new Error('The scanner engine did not initialise.');
        g.cv = mod;
        resolve(mod);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('The scanner engine failed to start.'));
      }
    };
    script.onerror = () => reject(new Error('The scanner engine failed to load.'));
    document.head.appendChild(script);
  });
  return cvPromise;
}

export interface Point {
  x: number;
  y: number;
}
export interface Quad {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Put four unordered points into tl / tr / br / bl. */
export function orderQuad(pts: Point[]): Quad {
  const bySum = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
  const byDiff = [...pts].sort((a, b) => a.y - a.x - (b.y - b.x));
  return { tl: bySum[0], br: bySum[3], tr: byDiff[0], bl: byDiff[3] };
}

/** A quad inset ~6% from the edges. The fallback when auto-detection fails. */
export function defaultQuad(w: number, h: number): Quad {
  const mx = w * 0.06;
  const my = h * 0.06;
  return {
    tl: { x: mx, y: my },
    tr: { x: w - mx, y: my },
    br: { x: w - mx, y: h - my },
    bl: { x: mx, y: h - my },
  };
}

/** Auto-detect the document's four corners in `src` (a canvas). Null if none. */
export async function detectQuad(src: HTMLCanvasElement): Promise<Quad | null> {
  const cv = await loadCv();
  const img = cv.imread(src);
  const work: { delete?: () => void }[] = [img];
  try {
    const scale = Math.min(1, 900 / Math.max(img.rows, img.cols));
    const small = new cv.Mat();
    cv.resize(img, small, new cv.Size(0, 0), scale, scale, cv.INTER_AREA);
    const gray = new cv.Mat();
    cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    const edges = new cv.Mat();
    cv.Canny(gray, edges, 75, 200);
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(edges, edges, kernel);
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    work.push(small, gray, edges, kernel, contours, hierarchy);

    const imgArea = small.rows * small.cols;
    let best: Point[] | null = null;
    let bestArea = imgArea * 0.2;

    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const peri = cv.arcLength(c, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(c, approx, 0.02 * peri, true);
      if (approx.rows === 4 && cv.isContourConvex(approx)) {
        const area = Math.abs(cv.contourArea(approx));
        if (area > bestArea) {
          bestArea = area;
          best = [];
          for (let r = 0; r < 4; r++) {
            best.push({ x: approx.data32S[r * 2] / scale, y: approx.data32S[r * 2 + 1] / scale });
          }
        }
      }
      approx.delete();
      c.delete();
    }
    return best ? orderQuad(best) : null;
  } finally {
    work.forEach((m) => m.delete?.());
  }
}

export type ScanMode = 'color' | 'grayscale' | 'bw';

export interface FlatPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/** Perspective-warp the quad region of `src` to a flat, upright rectangle. */
export async function flatten(
  src: HTMLCanvasElement,
  quad: Quad,
  mode: ScanMode,
): Promise<FlatPage> {
  const cv = await loadCv();
  const img = cv.imread(src);
  const out = new cv.Mat();
  const W = clamp(Math.round((dist(quad.tl, quad.tr) + dist(quad.bl, quad.br)) / 2), 240, 2200);
  const H = clamp(Math.round((dist(quad.tl, quad.bl) + dist(quad.tr, quad.br)) / 2), 240, 2800);

  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    quad.tl.x, quad.tl.y, quad.tr.x, quad.tr.y, quad.br.x, quad.br.y, quad.bl.x, quad.bl.y,
  ]);
  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, W, 0, W, H, 0, H]);
  const M = cv.getPerspectiveTransform(srcTri, dstTri);

  cv.warpPerspective(
    img, out, M, new cv.Size(W, H),
    cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255),
  );

  if (mode !== 'color') {
    cv.cvtColor(out, out, cv.COLOR_RGBA2GRAY);
    if (mode === 'bw') {
      cv.adaptiveThreshold(
        out, out, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 12,
      );
    } else {
      cv.equalizeHist(out, out);
    }
    cv.cvtColor(out, out, cv.COLOR_GRAY2RGBA);
  }

  const canvas = document.createElement('canvas');
  cv.imshow(canvas, out);
  [img, out, srcTri, dstTri, M].forEach((m) => m.delete());
  return { canvas, width: W, height: H };
}

/** Load a File / Blob into a plain canvas at its natural size. */
export async function toCanvas(src: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(src);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

export const canvasToJpeg = (canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not encode the page.'))),
      'image/jpeg',
      quality,
    ),
  );
