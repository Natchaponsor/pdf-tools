import { defineConfig } from '@vite-pwa/assets-generator/config';

// Kept for reference only. The PaperPal icon set was NOT produced by this
// generator: it pulls in a vulnerable sharp, and the mark needs different
// framing per target (the rounded tile is artwork on the regular icons, but
// maskable icons must run full bleed with the mark inside the 80% safe zone).
// They were rendered from the mark with headless Chrome instead, and the PNGs
// in public/ are committed. Regenerate by re-running that script rather than
// `npx pwa-assets-generator`, which would overwrite them with the wrong
// framing.
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
