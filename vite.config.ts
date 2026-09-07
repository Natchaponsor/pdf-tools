import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this project from https://<user>.github.io/pdf-tools/
// so every asset URL must be prefixed with that path.
const base = '/pdf-tools/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new deploy shows an "Update available" toast instead of silently
      // swapping the app out from under the user. Registration happens in
      // src/pwa.ts via the virtual module, not an injected inline script.
      registerType: 'prompt',
      injectRegister: null,
      // The Workbox runtime is pulled from workbox-build (a dependency of
      // vite-plugin-pwa) and inlined into the generated service worker at
      // build time. Nothing is fetched from a CDN.
      workbox: {
        inlineWorkboxRuntime: true,
        // Precache the app shell only. The WASM blobs and the Ghostscript
        // engine files in vendor/ are tens of MB — they get runtime-cached on
        // first use instead (see runtimeCaching below).
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        globIgnores: [
          '**/vendor/**',
          '**/workers/**',
          '**/*.wasm',
          'scan45.pdf',
          'selftest-fixture.pdf',
        ],
        // Hash routes are resolved by index.html; serve it for any navigation
        // within the app scope when offline.
        navigateFallback: `${base}index.html`,
        navigateFallbackAllowlist: [/^\/pdf-tools\//],
        runtimeCaching: [
          {
            // Tesseract.js OCR: worker, WebAssembly core, and language models
            // (public/vendor/tesseract/*, ~7 MB on first use of the OCR tool).
            urlPattern: ({ url }) => url.pathname.includes('/vendor/tesseract/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'paperplane-ocr',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // MuPDF's fingerprinted .wasm (Vite asset pipeline).
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'paperplane-wasm',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Ghostscript engine (public/vendor/*) and the classic worker
            // scripts (public/workers/*) — copied verbatim, not bundled.
            urlPattern: ({ url }) =>
              url.pathname.includes('/vendor/') || url.pathname.includes('/workers/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'paperplane-engines',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Paperplane',
        short_name: 'Paperplane',
        description:
          'Private PDF tools that run entirely on your device. Compress, merge, split, convert — nothing is uploaded.',
        id: base,
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#2563eb',
        background_color: '#f4f6fa',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      devOptions: { enabled: false },
    }),
  ],
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
