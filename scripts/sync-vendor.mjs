// Copies the WebAssembly engine files from node_modules into public/vendor so
// Vite serves them at a stable, base-path-aware URL (…/vendor/<file>).
// Run automatically before `dev` and `build`. Keeps large binaries out of git.
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, '..', 'public', 'vendor');
mkdirSync(outDir, { recursive: true });

// Ghostscript's worker is served verbatim from /public (not bundled by Vite),
// so its engine files need to sit at a predictable path. MuPDF is handled by
// Vite's asset pipeline and needs no copy.
const gsDir = dirname(require.resolve('@jspawn/ghostscript-wasm/gs.js'));

const files = [
  [join(gsDir, 'gs.wasm'), 'gs.wasm'],
  [join(gsDir, 'gs.js'), 'gs.js'],
];

for (const [src, name] of files) {
  const dest = join(outDir, name);
  copyFileSync(src, dest);
  console.log(`vendor: ${name}${existsSync(dest) ? ' ok' : ' MISSING'}`);
}

// ── Tesseract.js (OCR) ────────────────────────────────────────────────────
// tesseract.js loads its worker script, an Emscripten core, and the language
// model over the network from a CDN by default. We self-host all three so no
// user document (or anything else) ever leaves the device. The service worker
// runtime-caches them on first use — they are never precached.
const tessDir = join(outDir, 'tesseract');
const tessdataDir = join(tessDir, 'tessdata');
mkdirSync(tessdataDir, { recursive: true });

const tesseractWorker = require.resolve('tesseract.js/dist/worker.min.js');
const coreDir = dirname(require.resolve('tesseract.js-core/package.json'));

// LSTM-only cores (OEM 1) — smaller than the ones bundling the legacy engine.
// tesseract.js picks the best of these three at runtime by feature detection.
// Each `.wasm.js` has its WebAssembly embedded as base64 (SINGLE_FILE build),
// so the sibling `.wasm` is never fetched and isn't copied.
const cores = [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
];

// Language models — "best" integer LSTM (small + accurate). Each is fetched on
// first use of a tool that needs it and then cached for offline use. Add a
// language here + in OCR_LANGS in src/lib/ocr.ts to offer it.
const langs = ['eng', 'tha'];

const tessFiles = [
  [tesseractWorker, join(tessDir, 'worker.min.js')],
  ...cores.map((f) => [join(coreDir, f), join(tessDir, f)]),
  ...langs.map((code) => [
    require.resolve(`@tesseract.js-data/${code}/4.0.0_best_int/${code}.traineddata.gz`),
    join(tessdataDir, `${code}.traineddata.gz`),
  ]),
];

for (const [src, dest] of tessFiles) {
  copyFileSync(src, dest);
  const name = dest.slice(tessDir.length + 1);
  console.log(`vendor: tesseract/${name}${existsSync(dest) ? ' ok' : ' MISSING'}`);
}

// ── OpenCV.js (Scan documents — auto edge detection + perspective flatten) ──
// A single self-contained JS file (~13 MB, WASM embedded). Loaded lazily by the
// Scan tool via a <script> tag, runtime-cached, never precached.
const cvDir = join(outDir, 'opencv');
mkdirSync(cvDir, { recursive: true });
const cvSrc = require.resolve('@techstark/opencv-js/dist/opencv.js');
const cvDest = join(cvDir, 'opencv.js');
copyFileSync(cvSrc, cvDest);
console.log(`vendor: opencv/opencv.js${existsSync(cvDest) ? ' ok' : ' MISSING'}`);
