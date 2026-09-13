// Renders the PaperPal mark to the PWA icon set using headless Chrome, so no
// image library has to be installed. The project deliberately avoids sharp.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9500 + Math.floor(Math.random() * 400);
const OUT = process.argv[2];

const BLUE = '#2563eb';
const FOLD = '#b9d1ff';

/**
 * The full mark, matching public/logo.svg exactly but reversed to white.
 * Bounding box including stroke is 5,5 to 59,59, so its centre is 32,32.
 */
const FULL = `
  <path d="M42 7V22H57Z" fill="${FOLD}"/>
  <g stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M42 7H18A11 11 0 0 0 7 18V46A11 11 0 0 0 18 57H46A11 11 0 0 0 57 46V22Z"/>
    <path d="M42 7V22H57"/>
    <path d="M17 29H26"/>
    <path d="M38 29H47"/>
    <path d="M26 43Q32 48 38 43"/>
  </g>
  <circle cx="21.5" cy="35" r="3" fill="#fff"/>
  <circle cx="42.5" cy="35" r="3" fill="#fff"/>`;

/**
 * Tiny sizes only. The eyebrows are dropped and the stroke thickened, because
 * five separate features turn to mush in a 48px box. Geometry is spaced so the
 * eyes clear the fold's lower leg, which the first attempt did not.
 */
const SIMPLE = `
  <path d="M41 14V25H54Z" fill="${FOLD}"/>
  <g stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M41 14H21A9 9 0 0 0 12 23V39A9 9 0 0 0 21 48H45A9 9 0 0 0 54 39V25Z"/>
    <path d="M41 14V25H54"/>
    <path d="M26 40Q33 46 40 40"/>
  </g>
  <circle cx="25" cy="33" r="3.2" fill="#fff"/>
  <circle cx="41" cy="33" r="3.2" fill="#fff"/>`;

/** Scale about the mark's centre, then drop it in the canvas centre. */
const placed = (mark, scale, cx = 32, cy = 32) =>
  `<g transform="translate(32 32) scale(${scale}) translate(${-cx} ${-cy})">${mark}</g>`;

function svg(size, { radius, scale, mark, cx, cy }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="${radius}" fill="${BLUE}"/>
  ${placed(mark, scale, cx, cy)}
</svg>`;
}

const full = { mark: FULL, cx: 32, cy: 32 };
const simple = { mark: SIMPLE, cx: 33, cy: 31 };

const targets = [
  // Regular icons: the rounded tile is part of the artwork.
  { file: 'pwa-192x192.png', size: 192, radius: 14, scale: 0.78, ...full },
  { file: 'pwa-512x512.png', size: 512, radius: 14, scale: 0.78, ...full },
  // Maskable: full bleed, because the launcher supplies the shape. Pulled in
  // to 0.62 so the mark's diagonal stays inside the 80% safe circle whatever
  // mask is applied.
  { file: 'maskable-icon-192x192.png', size: 192, radius: 0, scale: 0.62, ...full },
  { file: 'maskable-icon-512x512.png', size: 512, radius: 0, scale: 0.62, ...full },
  // iOS rounds the corners itself and crops very little, so this runs fuller.
  { file: 'apple-touch-icon-180x180.png', size: 180, radius: 0, scale: 0.72, ...full },
  // Source for the .ico.
  { file: 'favicon-48.png', size: 48, radius: 10, scale: 0.92, ...simple },
];

const profile = mkdtempSync(join(tmpdir(), 'icons-'));
const chrome = spawn(CHROME, [
  '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error('devtools never came up');
}

const page = await target();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const waiting = new Map();
await new Promise((res) => (ws.onopen = res));
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) {
    const { resolve, reject } = waiting.get(m.id);
    waiting.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    waiting.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

await send('Page.enable');
for (const t of targets) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: t.size, height: t.size, deviceScaleFactor: 1, mobile: false,
  });
  await send('Emulation.setDefaultBackgroundColorOverride', {
    color: { r: 0, g: 0, b: 0, a: 0 },
  });
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(t.size, t));
  await send('Page.navigate', { url });
  await sleep(400);
  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(OUT, t.file), Buffer.from(data, 'base64'));
  console.log(`${t.file}  ${t.size}x${t.size}`);
}
ws.close();
chrome.kill();
process.exit(0);
