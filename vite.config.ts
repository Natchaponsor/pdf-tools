import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves this project from https://<user>.github.io/pdf-tools/
// so every asset URL must be prefixed with that path.
const base = '/pdf-tools/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  worker: {
    format: 'es',
  },
  // mupdf ships an ESM bundle with top-level await; let Vite serve it as-is
  // instead of pre-bundling it with esbuild.
  optimizeDeps: {
    exclude: ['mupdf'],
  },
  build: {
    target: 'es2022',
    // The engine .wasm files live in public/vendor and are copied verbatim.
    assetsInlineLimit: 0,
  },
});
