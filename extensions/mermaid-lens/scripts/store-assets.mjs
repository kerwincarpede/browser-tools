// Generates the images the stores ask for into store/assets/:
//   screenshot-*.png   1280×800  (Chrome: 1–5, Edge: 1–10)
//   promo-small.png    440×280   (small promo tile, both stores)
//   promo-marquee.png  1400×560  (Chrome marquee / Edge large tile, optional)
//   logo-300.png       300×300   (Edge store logo)
// Run after `npm run build`:  npm run store-assets
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { showcasePage } from '../test/fixtures/diagrams.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');
const out = path.join(root, 'store/assets');
await mkdir(out, { recursive: true });

execFileSync('rsvg-convert', ['-w', '300', '-h', '300', path.join(root, 'assets/icon.svg'), '-o', path.join(out, 'logo-300.png')]);

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
});
await context.route('https://github.com/acme/**', (route) => {
  const mode = new URL(route.request().url()).searchParams.get('mode') ?? 'light';
  route.fulfill({ contentType: 'text/html', body: showcasePage(mode) });
});
const page = await context.newPage();
const viewer = page.locator('mermaid-lens-viewer').first();
const node = (text) => viewer.locator('g.node', { hasText: text }).first();
const open = async (mode) => {
  await page.goto(`https://github.com/acme/shop/blob/main/docs/architecture.md?mode=${mode}`);
  await viewer.waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
  await viewer.hover();
  await page.waitForTimeout(300);
};
const [worker] = context.serviceWorkers().length ? context.serviceWorkers() : [await context.waitForEvent('serviceworker')];
const settings = (s) => worker.evaluate((o) => chrome.storage.sync.set(o), s);

// 1. Full-flow highlight with the toolbar showing.
await settings({ highlightMode: 'flow', highlightColor: '#f59e0b', flowAnimation: true, direction: 'both' });
await open('light');
await node('Orders service').click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(out, 'screenshot-1-highlight-flow.png') });

// 2. Highlight options popover, dark mode, pink.
await settings({ highlightMode: 'neighbors', highlightColor: '#ec4899', flowAnimation: false });
await open('dark');
await node('API gateway').click();
await viewer.locator('[data-act="pop-highlight"]').click();
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(out, 'screenshot-2-highlight-options.png') });

// 3. Full screen, zoomed in.
await settings({ highlightColor: '#6366f1' });
await open('light');
await viewer.locator('[data-act="fullscreen"]').click();
await page.waitForTimeout(700);
await node('Search service').click();
await page.mouse.move(640, 400);
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(out, 'screenshot-3-fullscreen.png') });
await page.keyboard.press('Escape');
await page.keyboard.press('f');
await page.waitForTimeout(300);

// 4. Copy & export menu.
await open('light');
await viewer.locator('[data-act="pop-copy"]').click();
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(out, 'screenshot-4-copy-export.png') });

// Promo tiles rendered from HTML so the type matches the UI.
const icon = `data:image/svg+xml;base64,${(await readFile(path.join(root, 'assets/icon.svg'))).toString('base64')}`;
const tile = (w, h, iconSize, title, sub) => `<!doctype html><html><body style="margin:0">
<div style="width:${w}px;height:${h}px;display:flex;align-items:center;gap:${iconSize * 0.28}px;padding:0 ${w * 0.08}px;box-sizing:border-box;
 background:radial-gradient(circle at 85% 20%,#8b93ff 0,transparent 55%),linear-gradient(135deg,#4f46e5,#312e81);color:#fff;
 font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
 <img src="${icon}" width="${iconSize}" height="${iconSize}" style="filter:drop-shadow(0 8px 24px rgba(0,0,0,.35));flex:none">
 <div><div style="font-size:${title}px;font-weight:700;letter-spacing:-.02em">Mermaid Lens</div>
 <div style="font-size:${sub}px;opacity:.85;margin-top:${sub * 0.4}px;line-height:1.35">Pan, zoom, highlight &amp; animate<br>Mermaid diagrams on GitHub</div></div>
</div></body></html>`;
for (const [file, w, h, iconSize, title, sub] of [
  ['promo-small.png', 440, 280, 110, 34, 16],
  ['promo-marquee.png', 1400, 560, 260, 84, 36],
]) {
  const p = await context.newPage();
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(tile(w, h, iconSize, title, sub));
  await p.screenshot({ path: path.join(out, file) });
  await p.close();
}

await settings({ highlightMode: 'neighbors', highlightColor: '#f59e0b', flowAnimation: false });
await context.close();
console.log(`✓ Store images written to ${path.relative(process.cwd(), out)}/`);
