import { defineConfig } from '@vite-pwa/assets-generator/config';

// One-off icon generation from public/favicon.svg. Run with:
//   npx pwa-assets-generator
// The PNGs it writes into public/ are committed; this config and the
// generator itself are dev-only and not part of `npm run build`.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: {
      sizes: [192, 512],
      favicons: [[48, 'favicon.ico']],
    },
    maskable: {
      sizes: [192, 512],
      padding: 0.3,
      resizeOptions: { background: '#2563eb', fit: 'contain' },
    },
    apple: {
      sizes: [180],
      padding: 0.3,
      resizeOptions: { background: '#2563eb', fit: 'contain' },
    },
  },
  images: ['public/favicon.svg'],
});
