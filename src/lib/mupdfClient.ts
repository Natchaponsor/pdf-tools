/*
 * Main-thread client for the shared MuPDF worker. Every tool that needs MuPDF
 * (compression, previews, page counts, page rendering) goes through here so
 * there is exactly one worker and one 10 MB WASM download per session.
 */
let worker: Worker | null = null;
function getWorker(): Worker {
  worker ??= new Worker(new URL('./workers/mupdf.worker.ts', import.meta.url), {
    type: 'module',
  });
  return worker;
}

let jobId = 0;

export function callMupdf(
  payload: Record<string, unknown>,
  transfer: Transferable[] = [],
): Promise<Record<string, unknown>> {
  const w = getWorker();
  const id = ++jobId;
  return new Promise((resolve, reject) => {
    const handle = (event: MessageEvent) => {
      if (event.data?.id !== id) return;
      cleanup();
      if (event.data.type === 'done') resolve(event.data);
      else reject(new Error(event.data.message ?? 'MuPDF worker error'));
    };
    const onError = () => {
      cleanup();
      reject(new Error('The PDF engine failed to load.'));
    };
    function cleanup() {
      w.removeEventListener('message', handle);
      w.removeEventListener('error', onError);
    }
    w.addEventListener('message', handle);
    w.addEventListener('error', onError);
    w.postMessage({ id, ...payload }, transfer);
  });
}
