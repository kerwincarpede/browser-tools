// Probe: render every sample in all-types.mjs through the built extension and report support.
import { chromium } from 'playwright';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { samples } from './fixtures/all-types.mjs';
import { githubSection } from './fixtures/diagrams.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');
const shots = path.join(root, 'test/screenshots/types');
await mkdir(shots, { recursive: true });
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium', headless: true, viewport: { width: 1100, height: 900 },
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
});
const html = `<!doctype html><html data-color-mode="light"><head><meta charset="utf-8"><style>.label{font-size:12px}body{font-family:sans-serif}</style></head><body><article style="max-width:900px;margin:auto">
${samples.map((s) => `<h2 id="h-${s.key}">${s.title}</h2><div data-key="${s.key}">${githubSection(s.code)}</div>`).join('\n')}</article></body></html>`;
await context.route('https://github.com/probe/**', (r) => r.fulfill({ contentType: 'text/html', body: html }));
await context.route('https://github.com/raw/**', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }));
const page = await context.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
await page.goto('https://github.com/probe/x');
await page.waitForTimeout(15000);

// Sandbox-vs-strict check straight against the vendored Mermaid in a blank page.
const raw = await context.newPage();
await raw.goto('https://github.com/raw/x');
await raw.addScriptTag({ path: path.join(dist, 'vendor/mermaid.min.js') });
await raw.addScriptTag({ path: path.join(dist, 'vendor/mermaid-zenuml.min.js') });
await raw.evaluate(() => mermaid.registerExternalDiagrams([globalThis['mermaid-zenuml']], { lazyLoad: true }));
const modes = {};
for (const s of samples) {
  modes[s.key] = await raw.evaluate(async (code) => {
    const res = {};
    for (const lvl of ['sandbox', 'strict']) {
      mermaid.initialize({ startOnLoad: false, securityLevel: lvl, suppressErrorRendering: true });
      try { const o = await mermaid.render('p' + Math.random().toString(36).slice(2), code); res[lvl] = o.diagramType; }
      catch (e) { res[lvl] = 'ERR: ' + String(e.message || e).slice(0, 90); }
    }
    return res;
  }, s.code);
}

const rows = [];
for (const s of samples) {
  const wrap = page.locator(`[data-key="${s.key}"]`);
  const v = wrap.locator('mermaid-lens-viewer');
  const r = { key: s.key, sandbox: modes[s.key].sandbox, strict: modes[s.key].strict };
  r.viewer = (await v.count()) > 0;
  if (r.viewer) {
    Object.assign(r, await v.evaluate((h) => {
      const svg = h.shadowRoot.querySelector('svg');
      const bb = svg?.getBBox();
      return {
        type: svg?.getAttribute('aria-roledescription'),
        size: bb ? `${Math.round(bb.width)}x${Math.round(bb.height)}` : '-',
        nodes: svg?.querySelectorAll('g.node').length ?? 0,
        clusters: svg?.querySelectorAll('g.cluster').length ?? 0,
        fo: svg?.querySelectorAll('foreignObject').length ?? 0,
        text: (svg?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 0),
        clipped: [...(svg?.querySelectorAll('foreignObject') ?? [])].filter((fo) => {
          const i = fo.firstElementChild; return i && i.textContent.trim() && i.scrollWidth - Number(fo.getAttribute('width')) > 1;
        }).length,
      };
    }));
    // Hover each candidate node until something lights up.
    await v.scrollIntoViewIfNeeded();
    const nodes = v.locator('g.node');
    r.highlight = false;
    const n = Math.min(await nodes.count(), 4);
    for (let i = 0; i < n && !r.highlight; i++) {
      try { await nodes.nth(i).hover({ timeout: 1500, force: true }); } catch { continue; }
      await page.waitForTimeout(80);
      r.lit = await v.evaluate((h) => h.shadowRoot.querySelectorAll('.ml-on').length);
      r.litEdges = await v.evaluate((h) => h.shadowRoot.querySelectorAll('.ml-edge.ml-on').length);
      r.highlight = r.lit > 1;
    }
    r.edges = await v.evaluate((h) => h.shadowRoot.querySelectorAll('.ml-edge').length);
    await page.mouse.move(5, 5);
    await v.screenshot({ path: path.join(shots, `${s.key}.png`), timeout: 5000 }).catch((e) => console.log(s.key, e.message.split("\n")[0]));
  }
  rows.push(r);
}
console.table(rows.map(({ key, sandbox, strict, viewer, type, size, nodes, clusters, edges, highlight, litEdges, clipped }) =>
  ({ key, sandbox, strict: strict === sandbox ? '=' : strict, viewer, type, size, nodes, clusters, edges, highlight, litEdges, clipped })));
console.log(logs.filter((l) => /Mermaid Lens|error/i.test(l)).slice(0, 30).join('\n'));
await context.close();
