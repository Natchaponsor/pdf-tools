# Paperplane

Private PDF tools that run **entirely in your browser** — compress, merge, split,
organize pages, convert to and from images, add page numbers or watermarks, and
shrink image files. No account, no server, and your files never leave your device.

> **Files are processed on your device and never uploaded.** There is no backend,
> no analytics, and no external request that carries your file anywhere. You can
> open the network tab and check.

Live: **https://natchaponsor.github.io/pdf-tools/**

## Why

Most "compress a PDF" websites upload your document to a server you don't
control. Paperplane does the whole job locally using WebAssembly builds of
mature PDF engines, so a confidential contract or a pile of payslips never
touches the network.

## Features

### v1

| Tool | What it does |
| --- | --- |
| **Compress PDF** | Shrink one or several PDFs at once (shared 50 MB budget). Three quality levels, first-page preview and before/after size per file, download individually or as a `.zip`. |
| **Merge PDFs** | Combine several PDFs into one, in an order you set. |
| **Split PDF** | Extract a page range (`1-3, 5, 8-10`) or burst into single-page PDFs (`.zip`). |
| **Organize pages** | Drag page thumbnails to reorder, rotate, or delete, then export a new PDF. |
| **PDF to image** | Render pages to PNG or JPG at 72/150/300 DPI — one page, or a `.zip`. |
| **Images to PDF** | Combine JPG/PNG images into one PDF (fit-to-image, A4, or Letter). |
| **Compress image** | Shrink JPG, PNG, or WebP files, several at a time. |
| **Add page numbers** | Position, style (`1`, `Page 1`, `1 / N`), size, and start number. |
| **Add watermark** | Diagonal or horizontal text with adjustable opacity and size. |

Every result screen lets you rename the file before saving (the extension is
fixed; a blank name falls back to the generated default).

### Compress PDF — how it works

| Level | Engine | Approach | Typical result\* |
| --- | --- | --- | --- |
| **Light** | MuPDF | Lossless clean-up: dedupe objects, object streams, recompress streams, subset fonts. Keeps selectable text and full image quality. | 0–20% smaller (more on bloated exports) |
| **Balanced** | Ghostscript `/ebook` | Downsample images to 150 DPI + re-encode. Keeps vector text. | ~90–95% smaller on scans |
| **Smallest** | Ghostscript `/screen` | Downsample images to 72 DPI + re-encode. | ~95–97% smaller on scans |

\* Measured on a 44.9 MB, 24-page scanned-photo PDF, running in the browser on a
laptop:

```
Light      44.9 MB → 44.9 MB   (0% — nothing to strip on this file)   ~0.1 s
Balanced   44.9 MB →  2.2 MB   (95% smaller)                          ~16 s
Smallest   44.9 MB →  1.1 MB   (97% smaller)                          ~9 s
```

Text-born PDFs that are already efficient won't shrink much at any level — that's
expected, and the app tells you so instead of pretending.

## Tech

- **React + Vite + Tailwind CSS v4**, TypeScript. Each tool view is code-split
  and loaded on demand, so the home screen stays light.
- **Hash-based routing** (`#/compress`). No history API, so a refresh or a deep
  link works on GitHub Pages with no server rewrites.
- **[`mupdf`](https://www.npmjs.com/package/mupdf)** — MuPDF.js WASM. One shared
  ES-module worker handles the lossless compression tier, page counts, page
  rendering (organize thumbnails, PDF → image), and first-page previews.
- **[`@jspawn/ghostscript-wasm`](https://www.npmjs.com/package/@jspawn/ghostscript-wasm)**
  — Ghostscript 9.56 WASM, for the image-downsampling compression tiers. Loaded
  lazily in a plain worker served from `public/` so its `.wasm` path stays
  correct under the Pages base path.
- **[`pdf-lib`](https://www.npmjs.com/package/pdf-lib)** — merge, split, organize,
  images → PDF, page numbers, watermark.
- **[`browser-image-compression`](https://www.npmjs.com/package/browser-image-compression)**
  — the image compressor. Run with `useWebWorker: false` on purpose: its worker
  mode fetches code from a CDN, which would break the privacy guarantee.
- **[`jszip`](https://www.npmjs.com/package/jszip)** — multi-file `.zip` output.

### No cross-origin isolation needed

Both WASM engines are **single-threaded** builds. They do **not** use
`SharedArrayBuffer` and do **not** require the `COOP`/`COEP` headers that
GitHub Pages cannot set. This is verified end to end:

- `#/selftest` prints `crossOriginIsolated: false` and still compresses a 45 MB
  file with both engines.
- Confirmed on the live GitHub Pages deployment, on desktop and mobile browsers.

If a future engine ever needs threads, the fallback would be
[`coi-serviceworker`](https://github.com/gzuidhof/coi-serviceworker) — but it
isn't used today.

## Run locally

```bash
npm install
npm run dev
```

Then open the printed URL (`http://localhost:5173/pdf-tools/`).

`npm run dev` and `npm run build` first run `scripts/sync-vendor.mjs`, which
copies the Ghostscript engine files from `node_modules` into `public/vendor/`.
Those copies are git-ignored and regenerated on every build.

### Manual smoke test

Open **`#/selftest`** and click **Run on bundled fixture** (a small committed
PDF). It runs all three levels and reports sizes, timing, and whether the page
is cross-origin isolated. To test a big file, drop a PDF named `scan45.pdf` into
`public/` (git-ignored) and use **Run on /scan45.pdf**, or just pick any file.

## Build

```bash
npm run build      # → dist/
npm run preview     # serve dist/ at the real base path, no special headers
```

`vite.config.ts` sets `base: '/pdf-tools/'`. If you fork this under a different
repository name, change that string to `'/<your-repo-name>/'`.

The `.wasm` files are handled two ways: MuPDF's is fingerprinted and emitted by
Vite's asset pipeline; Ghostscript's is copied verbatim into `dist/vendor/`.
Both end up under the correct base path in `dist/`.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which:

1. `npm ci` + `npm run build`
2. uploads `dist/` with `actions/upload-pages-artifact`
3. deploys it with `actions/deploy-pages`

No secrets required. The workflow uses the official GitHub Pages actions and the
`pages` / `id-token` permissions.

### Turning Pages on (one time, in the GitHub web UI)

1. Push this repository to GitHub as **`pdf-tools`** (public).
2. **Settings → Pages → Build and deployment → Source: “GitHub Actions”.**
3. **Settings → Actions → General → Workflow permissions:** “Read and write
   permissions” (needed for the Pages deployment).
4. Push to `main` (or re-run the workflow from the **Actions** tab). When it
   finishes, the site is at `https://<your-username>.github.io/pdf-tools/`.

## License

**AGPL-3.0-or-later.** MuPDF and Ghostscript are both AGPL, so anything that
bundles them is too. The full text is in [`LICENSE`](./LICENSE).

Copyright © 2026 Top. This program comes with ABSOLUTELY NO WARRANTY. This is
free software, and you are welcome to redistribute it under the terms of the
GNU Affero General Public License.
