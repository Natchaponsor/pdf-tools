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
