/*
 * Ghostscript client — spawns the plain worker in public/workers/gs.worker.js
 * (single-threaded WASM, no cross-origin isolation) and runs `gs -sDEVICE=pdfwrite`
 * with the given extra args. Used by both the compressor and the greyscale tool.
 */
export interface GsProgress {
  ratio: number | null;
  note: string;
}

export interface GsOutcome {
  blob: Blob;
  outputBytes: number;
  ms: number;
}

let jobId = 0;

export async function runGhostscript(
  source: File | ArrayBuffer,
  args: string[],
  onProgress: (p: GsProgress) => void,
  verb = 'Working',
): Promise<GsOutcome> {
  const buffer = source instanceof ArrayBuffer ? source : await source.arrayBuffer();
  const id = ++jobId;
  // A fresh worker each run — Ghostscript holds a lot of state and memory.
  const worker = new Worker(`${import.meta.env.BASE_URL}workers/gs.worker.js`);
  onProgress({ ratio: null, note: 'Loading the engine…' });

  const start = performance.now();
  let ticking = false;
  const elapsed = () => `${verb}… ${Math.round((performance.now() - start) / 1000)}s elapsed`;
  const tick = setInterval(() => {
    if (ticking) onProgress({ ratio: null, note: elapsed() });
  }, 1000);

  return new Promise<GsOutcome>((resolve, reject) => {
    const handle = (event: MessageEvent) => {
      const data = event.data;
      if (data.id !== id) return;
      if (data.type === 'progress') {
        ticking = true;
        onProgress({
          ratio: data.pages ? data.page / data.pages : null,
          note: data.pages ? `${verb} page ${data.page} of ${data.pages}…` : elapsed(),
        });
      } else if (data.type === 'done') {
        cleanup();
        resolve({
          blob: new Blob([data.output], { type: 'application/pdf' }),
          outputBytes: data.output.byteLength,
          ms: data.ms,
        });
      } else if (data.type === 'error') {
        cleanup();
        reject(new Error(data.message));
      }
    };
    const onError = () => {
      cleanup();
      reject(new Error('The engine failed to load.'));
    };
    function cleanup() {
      clearInterval(tick);
      worker.removeEventListener('message', handle);
      worker.removeEventListener('error', onError);
      worker.terminate();
    }
    worker.addEventListener('message', handle);
    worker.addEventListener('error', onError);
    worker.postMessage({ id, file: buffer, args }, [buffer]);
  });
}
