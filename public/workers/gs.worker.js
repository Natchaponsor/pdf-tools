/*
 * Ghostscript compression worker (classic worker, served verbatim from /public).
 *
 * Kept out of the Vite build on purpose: it `importScripts()` the Emscripten
 * glue (../vendor/gs.js) and streams in ../vendor/gs.wasm itself, so the paths
 * stay correct under the GitHub Pages base path without any bundler help and
 * without needing cross-origin isolation (the build is single-threaded).
 *
 * Message in:  { id, file: ArrayBuffer, args: string[] }
 * Message out: { id, type: 'progress', page, pages }
 *              { id, type: 'done', output: ArrayBuffer, ms }
 *              { id, type: 'error', message }
 */

/* global importScripts */

self.exports = {};

let modulePromise = null;

// gs.js and gs.wasm sit one directory up from this worker (…/vendor/).
const VENDOR = new URL('../vendor/', self.location.href);

function loadGlue() {
  if (!self.exports.Module) {
    importScripts(new URL('gs.js', VENDOR).href);
  }
  return self.exports.Module;
}

async function getModule(onLine) {
  const createModule = loadGlue();
  return createModule({
    noInitialRun: true,
    print: onLine,
    printErr: onLine,
    locateFile: (path) => new URL(path, VENDOR).href,
    // Node-style fetch of a bare path fails in some engines; instantiate ourselves.
    instantiateWasm(imports, done) {
      fetch(new URL('gs.wasm', VENDOR).href)
        .then((r) => r.arrayBuffer())
        .then((bytes) => WebAssembly.instantiate(bytes, imports))
        .then((result) => done(result.instance, result.module))
        .catch((err) => setTimeout(() => { throw err; }));
      return {};
    },
  });
}

self.onmessage = async (event) => {
  const { id, file, args } = event.data;
  const started = performance.now();
  try {
    let pages = 0;
    const onLine = (line) => {
      if (typeof line !== 'string') return;
      const total = line.match(/Processing pages \d+ through (\d+)/);
      if (total) pages = Number(total[1]);
      const cur = line.match(/^Page (\d+)/);
      if (cur) {
        self.postMessage({ id, type: 'progress', page: Number(cur[1]), pages });
      }
    };

    // A fresh module per job keeps the in-memory filesystem clean.
    modulePromise = getModule(onLine);
    const mod = await modulePromise;
    self.postMessage({ id, type: 'progress', page: 0, pages: 0 });

    mod.FS.writeFile('/input.pdf', new Uint8Array(file));
    const code = mod.callMain([
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.7',
      '-dNOPAUSE',
      '-dBATCH',
      '-dSAFER',
      '-dDetectDuplicateImages=true',
      '-dCompressFonts=true',
      '-dSubsetFonts=true',
      ...args,
      '-sOutputFile=/output.pdf',
      '/input.pdf',
    ]);

    if (code !== 0) throw new Error(`Ghostscript exited with code ${code}`);

    const output = mod.FS.readFile('/output.pdf');
    const buffer = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
    self.postMessage({ id, type: 'done', output: buffer, ms: performance.now() - started }, [buffer]);
  } catch (err) {
    self.postMessage({
      id,
      type: 'error',
      message: err && err.message ? err.message : String(err),
    });
  }
};
