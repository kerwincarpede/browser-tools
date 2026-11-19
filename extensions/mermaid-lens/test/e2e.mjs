// End-to-end test: loads dist/ as an unpacked extension in Playwright's Chromium,
// serves a GitHub-shaped page at https://github.com/... and drives the UI.
//   node test/e2e.mjs            run checks against the fixture
//   node test/e2e.mjs --live     also check a real GitHub README
//   HEADED=1 node test/e2e.mjs   watch it run
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { samples } from './fixtures/all-types.mjs';
import { githubPage } from './fixtures/diagrams.mjs';
import { samplePage } from './sample/page.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');
const shots = path.join(root, 'test/screenshots');
await mkdir(shots, { recursive: true });

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: !process.env.HEADED,
  viewport: { width: 1200, height: 900 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
});
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://github.com' });

let [worker] = context.serviceWorkers();
worker ??= await context.waitForEvent('serviceworker');
const setStorage = (obj) => worker.evaluate((o) => chrome.storage.sync.set(o), obj);

await context.route('https://github.com/mermaid-lens-test/**', (route) => {
  const mode = new URL(route.request().url()).searchParams.get('mode') ?? 'light';
  route.fulfill({ contentType: 'text/html', body: githubPage(mode) });
});
await context.route('https://github.com/mermaid-lens-test/gallery', (route) =>
  route.fulfill({ contentType: 'text/html', body: samplePage() }),
);
await context.route('https://github.com/vendor/mermaid.min.js', (route) =>
  route.fulfill({ contentType: 'text/javascript', path: path.join(dist, 'vendor/mermaid.min.js') }),
);

const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

let passed = 0;
const step = async (name, fn) => {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

console.log('Mermaid Lens e2e');
await page.goto('https://github.com/mermaid-lens-test/readme');
const viewers = page.locator('mermaid-lens-viewer');

await step('renders a viewer for each valid diagram, leaves the broken one alone', async () => {
  await assert.doesNotReject(viewers.nth(4).waitFor({ timeout: 20000 }));
  await page.waitForTimeout(500);
  assert.equal(await viewers.count(), 5);
  const hidden = await page.$$eval('section[data-type="mermaid"]', (els) => els.map((e) => getComputedStyle(e).display));
  assert.deepEqual(hidden, ['none', 'none', 'none', 'none', 'none', 'block']);
});

/** Every HTML label must fit inside the box Mermaid measured for it. */
const clippedLabels = () =>
  viewers.evaluateAll((hosts) =>
    hosts.flatMap((h) =>
      [...h.shadowRoot.querySelectorAll('foreignObject')].flatMap((fo) => {
        const inner = fo.firstElementChild;
        if (!inner || !inner.textContent.trim()) return [];
        const over = inner.scrollWidth - Number(fo.getAttribute('width'));
        return over > 1 ? [`${inner.textContent.trim()} (+${over.toFixed(1)}px)`] : [];
      }),
    ),
  );

await step('labels are not clipped despite page CSS', async () => {
  assert.deepEqual(await clippedLabels(), []);
});

await step('Mermaid\'s built-in drop shadows are removed', async () => {
  const shadowed = await viewers.evaluateAll((hosts) =>
    hosts.flatMap((h) =>
      [...h.shadowRoot.querySelectorAll('svg *')]
        .filter((el) => getComputedStyle(el).filter !== 'none')
        .map((el) => `${el.tagName}.${el.getAttribute('class')}: ${getComputedStyle(el).filter}`),
    ),
  );
  assert.deepEqual(shadowed, []);
});

const flow = viewers.nth(0);
const nodeByLabel = (v, text) => v.locator('g.node', { hasText: text }).first();
const classesOf = (v, text) => nodeByLabel(v, text).evaluate((n) => [...n.classList].filter((c) => c.startsWith('ml-')));

await step('toolbar appears on hover', async () => {
  const toolbar = flow.locator('.toolbar');
  assert.equal(await toolbar.evaluate((t) => getComputedStyle(t).opacity), '0');
  await flow.hover();
  await page.waitForTimeout(300);
  assert.equal(await toolbar.evaluate((t) => getComputedStyle(t).opacity), '1');
  await flow.screenshot({ path: path.join(shots, 'flow-hover.png') });
});

await step('node outlines are faint until lit', async () => {
  const opacity = (text) =>
    nodeByLabel(flow, text).evaluate((n) => getComputedStyle(n.querySelector('rect, polygon, circle, path')).strokeOpacity);
  assert.equal(await opacity('Start'), '0.4');
  await nodeByLabel(flow, 'Start').hover();
  await page.waitForTimeout(250);
  assert.equal(await opacity('Start'), '1');
  const b = await flow.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y - 40);
  await page.waitForTimeout(250);
});

await step('the diagram has no border', async () => {
  const border = await flow.locator('.frame').evaluate((f) => getComputedStyle(f).borderTopWidth);
  assert.equal(border, '0px');
});

await step('hovering a node highlights its connections; leaving clears it', async () => {
  await nodeByLabel(flow, 'Is it?').hover();
  await page.waitForTimeout(50);
  assert.deepEqual(await classesOf(flow, 'Is it?'), ['ml-on', 'ml-sel']);
  assert.deepEqual(await classesOf(flow, 'OK'), ['ml-on']);
  assert.deepEqual(await classesOf(flow, 'End'), []);
  await flow.screenshot({ path: path.join(shots, 'flow-hover-highlight.png') });
  await nodeByLabel(flow, 'End').hover();
  await page.waitForTimeout(50);
  assert.deepEqual(await classesOf(flow, 'End'), ['ml-on', 'ml-sel']);
  assert.deepEqual(await classesOf(flow, 'Is it?'), []);
  const b = await flow.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y - 40); // off the diagram
  await page.waitForTimeout(250);
  assert.deepEqual(await classesOf(flow, 'End'), []);
});

await step('the toolbar button cycles Connected → Full flow → Off (H too)', async () => {
  await flow.hover();
  const btn = flow.locator('[data-act="cycle-highlight"]');
  const stored = () => worker.evaluate(() => chrome.storage.sync.get(['highlight', 'highlightMode']));
  const hoverClasses = async (hoverText, checkText) => {
    await nodeByLabel(flow, hoverText).hover();
    await page.waitForTimeout(50);
    return classesOf(flow, checkText);
  };
  assert.equal(await btn.getAttribute('data-state'), 'neighbors', 'Connected by default');
  assert.deepEqual(await hoverClasses('Start', 'OK'), [], 'Connected: two hops away stays dim');

  await btn.click();
  assert.equal(await btn.getAttribute('data-state'), 'flow');
  assert.equal((await stored()).highlightMode, 'flow');
  assert.deepEqual(await hoverClasses('Start', 'OK'), ['ml-on'], 'Full flow reaches downstream nodes');

  await btn.click();
  assert.equal(await btn.getAttribute('data-state'), 'off');
  assert.equal((await stored()).highlight, false);
  assert.deepEqual(await hoverClasses('Is it?', 'Is it?'), [], 'no highlight while off');

  await page.keyboard.press('h');
  await page.waitForTimeout(100);
  assert.equal(await btn.getAttribute('data-state'), 'neighbors');
  assert.deepEqual(await hoverClasses('Start', 'Start'), ['ml-on', 'ml-sel']);
});

await step('clicking a node pins its highlight', async () => {
  await nodeByLabel(flow, 'Is it?').click();
  const b = await flow.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y - 40);
  await page.waitForTimeout(250);
  assert.deepEqual(await classesOf(flow, 'Is it?'), ['ml-on', 'ml-sel']);
  for (const t of ['Start', 'OK', 'Not OK']) assert.deepEqual(await classesOf(flow, t), ['ml-on'], t);
  assert.deepEqual(await classesOf(flow, 'End'), [], 'End is two hops away');
  const litEdges = await flow.locator('path.ml-edge.ml-on').count();
  assert.equal(litEdges, 3);
  await flow.screenshot({ path: path.join(shots, 'flow-neighbors.png') });
});

const openHighlightOptions = async (v) => {
  await v.hover();
  await v.locator('[data-act="pop-more"]').click();
  await v.locator('[data-act="pop-highlight"]').click();
  await v.locator('[data-pop="highlight"].open').waitFor();
};

await step('"Full flow" lights up everything downstream and upstream', async () => {
  await openHighlightOptions(flow);
  await flow.locator('[data-act="set-highlightMode"][data-val="flow"]').click();
  await page.waitForTimeout(100);
  for (const t of ['Start', 'OK', 'Not OK', 'End', 'Done']) assert.deepEqual(await classesOf(flow, t), ['ml-on'], t);
  // D --> sub_1 must attach to the subgraph, not to a node inside it.
  const cluster = await flow.locator('g.cluster').evaluate((c) => c.classList.contains('ml-on'));
  assert.ok(cluster, 'subgraph is lit via the D --> sub_1 edge');
});

await step('downstream-only direction', async () => {
  await flow.locator('[data-act="set-direction"][data-val="down"]').click();
  await page.waitForTimeout(100);
  assert.deepEqual(await classesOf(flow, 'Start'), [], 'upstream Start is not lit');
  assert.deepEqual(await classesOf(flow, 'Done'), ['ml-on']);
  await flow.locator('[data-act="set-direction"][data-val="both"]').click();
});

await step('changing the colour recolours highlights (and syncs to other diagrams)', async () => {
  await flow.locator('.swatch[data-color="#ec4899"]').click();
  await page.waitForTimeout(300);
  const stroke = await flow.locator('path.ml-edge.ml-on').first().evaluate((p) => getComputedStyle(p).stroke);
  assert.equal(stroke, 'rgb(236, 72, 153)');
  const other = await viewers.nth(2).evaluate((h) => h.style.getPropertyValue('--ml-hl'));
  assert.equal(other, '#ec4899');
  await flow.screenshot({ path: path.join(shots, 'flow-fullflow-pink.png') });
  await page.keyboard.press('Escape'); // close popover
  await page.keyboard.press('Escape'); // clear highlight
  assert.deepEqual(await classesOf(flow, 'Is it?'), []);
});

await step('clicking an edge highlights it and its endpoints', async () => {
  await setStorage({ highlightMode: 'neighbors' });
  await page.waitForTimeout(200);
  const hit = flow.locator('path.ml-hit').first();
  const box = await hit.boundingBox();
  // Click the middle of the first edge's hit area (Start -> Is it?).
  const mid = await hit.evaluate((p) => {
    const pt = p.getPointAtLength(p.getTotalLength() / 2).matrixTransform(p.getScreenCTM());
    return { x: pt.x, y: pt.y };
  });
  assert.ok(box);
  await page.mouse.click(mid.x, mid.y);
  assert.deepEqual(await classesOf(flow, 'Start'), ['ml-on']);
  assert.deepEqual(await classesOf(flow, 'Is it?'), ['ml-on']);
  assert.deepEqual(await classesOf(flow, 'OK'), []);
  await page.keyboard.press('Escape');
});

await step('state and class diagrams get a graph too', async () => {
  const state = viewers.nth(2);
  await state.hover();
  await nodeByLabel(state, 'Moving').click();
  assert.deepEqual(await classesOf(state, 'Still'), ['ml-on']);
  assert.deepEqual(await classesOf(state, 'Crash'), ['ml-on']);
  await page.keyboard.press('Escape');
  const klass = viewers.nth(3);
  await klass.hover();
  await nodeByLabel(klass, 'Duck').click();
  assert.deepEqual(await classesOf(klass, 'Animal'), ['ml-on']);
  assert.deepEqual(await classesOf(klass, 'Fish'), []);
  await page.keyboard.press('Escape');
});

await step('ctrl+wheel zooms, drag pans, 0 resets', async () => {
  await flow.scrollIntoViewIfNeeded();
  await flow.hover();
  const label = flow.locator('.zoom-label');
  const before = await label.textContent();
  const vb0 = await flow.locator('svg.ml-svg').getAttribute('viewBox');
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -300);
  await page.keyboard.up('Control');
  await page.waitForTimeout(100);
  assert.notEqual(await label.textContent(), before);
  const b = await flow.boundingBox();
  await page.mouse.move(b.x + 40, b.y + b.height - 30);
  await page.mouse.down();
  await page.mouse.move(b.x + 140, b.y + b.height - 60, { steps: 5 });
  await page.mouse.up();
  const vb1 = await flow.locator('svg.ml-svg').getAttribute('viewBox');
  assert.notEqual(vb1, vb0);
  await page.keyboard.press('0');
  await page.waitForTimeout(50);
  assert.equal(await label.textContent(), before);
});

await step('plain wheel scrolls the page (no zoom hijack)', async () => {
  await flow.hover();
  const y0 = await page.evaluate(() => scrollY);
  const z0 = await flow.locator('.zoom-label').textContent();
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(200);
  assert.ok((await page.evaluate(() => scrollY)) > y0);
  assert.equal(await flow.locator('.zoom-label').textContent(), z0);
  await page.evaluate(() => scrollTo(0, 0));
});

await step('copy Mermaid code', async () => {
  await flow.hover();
  await flow.locator('[data-act="pop-copy"]').click();
  await flow.locator('[data-act="copy-code"]').click();
  await page.waitForTimeout(200);
  const text = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(text, /^flowchart LR\n {2}A\[Start\] --> B\{Is it\?\}/);
  assert.match(await flow.locator('.toast').textContent(), /copied/i);
});

await step('copy as PNG puts an image on the clipboard', async () => {
  await flow.hover();
  await flow.locator('[data-act="pop-copy"]').click();
  await flow.locator('[data-act="copy-png"]').click();
  await page.waitForTimeout(1500);
  const types = await page.evaluate(async () => (await navigator.clipboard.read()).flatMap((i) => i.types));
  assert.ok(types.includes('image/png'), `clipboard types: ${types}`);
  assert.match(await flow.locator('.toast').textContent(), /Image copied/);
});

await step('download SVG produces a standalone file', async () => {
  await flow.hover();
  await flow.locator('[data-act="pop-copy"]').click();
  const [download] = await Promise.all([page.waitForEvent('download'), flow.locator('[data-act="download-svg"]').click()]);
  assert.equal(download.suggestedFilename(), 'mermaid-flowchart.svg');
  const file = await download.path();
  const svg = (await import('node:fs')).readFileSync(file, 'utf8');
  assert.match(svg, /^<svg[^>]+xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(svg, /<style>/);
  assert.doesNotMatch(svg, /ml-hit|ml-on/);
  assert.doesNotMatch(svg, /drop-shadow/);
});

await step('expanded view fills the tab and exits without native fullscreen', async () => {
  const button = flow.getByRole('button', { name: 'Expand in tab' });
  await flow.hover();
  const inline = await flow.locator('.frame').boundingBox();
  await button.click();

  const dialog = flow.locator('dialog:modal');
  await dialog.waitFor();
  assert.equal(await page.evaluate(() => document.fullscreenElement), null);
  const { width, height } = page.viewportSize();
  assert.deepEqual(await dialog.boundingBox(), { x: 0, y: 0, width, height });
  assert.equal((await flow.boundingBox()).height, inline.height);
  assert.ok(await flow.getByRole('button', { name: 'Return to page' }).isVisible());
  await page.screenshot({ path: path.join(shots, 'fullscreen.png') });

  await page.keyboard.press('f');
  await dialog.waitFor({ state: 'hidden' });
  assert.deepEqual(await flow.locator('.frame').boundingBox(), inline);
  assert.ok(await button.evaluate((el) => el.getRootNode().activeElement === el));

  await flow.locator('.frame').press('Escape'); // clear any previous highlight pins
  await flow.locator('.frame').press('f');
  await dialog.waitFor();
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
});

await step('flowing edges and build-up replay', async () => {
  await setStorage({ buildDuration: 3.2 }); // keep this step quick; defaults are checked below
  await flow.hover();
  await flow.locator('[data-act="toggle-flow"]').click();
  assert.equal(await flow.locator('[data-act="toggle-flow"]').getAttribute('aria-pressed'), 'true');
  await page.waitForTimeout(200);
  const anim = await flow.locator('path.ml-edge').first().evaluate((p) => getComputedStyle(p).animationName);
  assert.equal(anim, 'ml-flow');
  await flow.locator('[data-act="replay"]').click();
  await page.waitForTimeout(300);
  await flow.screenshot({ path: path.join(shots, 'replay-midway.png') });
  await page.waitForTimeout(4500);
  const after = await flow.locator('path.ml-edge').first().evaluate((p) => getComputedStyle(p).animationName);
  assert.equal(after, 'ml-flow', 'flowing resumes after replay');
  const seq = viewers.nth(1);
  await seq.hover();
  await seq.locator('[data-act="replay"]').click(); // non-graph diagram path
  await page.waitForTimeout(3500);
  await worker.evaluate(() => chrome.storage.sync.remove('buildDuration'));
});

await step('⋯ → Animation timing sets the flow cycle and build-up length', async () => {
  await flow.hover();
  await flow.locator('[data-act="pop-more"]').click();
  await flow.locator('[data-act="pop-timing"]').click();
  await flow.locator('[data-pop="timing"].open').waitFor();
  assert.equal(await flow.locator('output[data-out="flowDuration"]').textContent(), '1.5s', 'default flow cycle');
  assert.equal(await flow.locator('output[data-out="buildDuration"]').textContent(), '8.0s', 'default build-up');
  const setSlider = (key, v) =>
    flow.locator(`input[data-timing="${key}"]`).evaluate((r, v) => {
      r.value = String(v);
      r.dispatchEvent(new Event('input', { bubbles: true }));
      r.dispatchEvent(new Event('change', { bubbles: true }));
    }, v);
  await setSlider('flowDuration', 2);
  await setSlider('buildDuration', 1);
  await page.waitForTimeout(200);
  assert.equal(await flow.locator('output[data-out="flowDuration"]').textContent(), '2.0s');
  const dur = await flow.locator('path.ml-edge').first().evaluate((p) => getComputedStyle(p).animationDuration);
  assert.equal(dur, '2s');
  const stored = await worker.evaluate(() => chrome.storage.sync.get(['flowDuration', 'buildDuration']));
  assert.deepEqual(stored, { flowDuration: 2, buildDuration: 1 });
  await page.keyboard.press('Escape');
  // A 1s build-up finishes well before the default 8s one would.
  await flow.locator('[data-act="replay"]').click();
  await page.waitForTimeout(1600);
  const running = await flow.evaluate((h) => h.shadowRoot.querySelector('svg').getAnimations({ subtree: true }).filter((a) => !(a instanceof CSSAnimation)).length);
  assert.equal(running, 0, 'build-up finished early');
  await worker.evaluate(() => chrome.storage.sync.remove(['flowAnimation', 'flowDuration', 'buildDuration']));
});

await step('"Enabled on this site" switch restores GitHub’s originals; popup toggle brings it back', async () => {
  await flow.hover();
  await flow.locator('[data-act="pop-more"]').click();
  await flow.locator('[data-act="disable-site"]').click();
  await page.waitForTimeout(300);
  assert.equal(await viewers.count(), 0);
  const shown = await page.$$eval('section[data-type="mermaid"]', (els) => els.map((e) => getComputedStyle(e).display));
  assert.deepEqual(shown, ['block', 'block', 'block', 'block', 'block', 'block']);
  const stored = await worker.evaluate(() => chrome.storage.sync.get('disabledSites'));
  assert.deepEqual(stored.disabledSites, ['github.com']);
  await setStorage({ disabledSites: [] });
  await viewers.nth(4).waitFor({ timeout: 10000 });
  assert.equal(await viewers.count(), 5);
});

await step('dark mode page renders with the dark theme', async () => {
  await page.goto('https://github.com/mermaid-lens-test/readme?mode=dark');
  await viewers.nth(3).waitFor({ timeout: 20000 });
  assert.equal(await viewers.first().getAttribute('data-ui'), 'dark');
  const strokes = await viewers.evaluateAll((hosts) =>
    hosts.flatMap((h) =>
      [...h.shadowRoot.querySelectorAll('g.node *, g.cluster > rect, rect.actor')]
        .map((el) => getComputedStyle(el).stroke)
        .filter((s) => s.startsWith('url(')),
    ),
  );
  assert.deepEqual(strokes, [], 'node borders are solid, not gradients');
  await viewers.first().hover();
  await nodeByLabel(viewers.first(), 'Not OK').click();
  await page.waitForTimeout(300);
  await viewers.first().screenshot({ path: path.join(shots, 'flow-dark.png') });
  await openHighlightOptions(viewers.first());
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(shots, 'dark-popover.png'), clip: { x: 0, y: 0, width: 1200, height: 560 } });
});

await step('popup renders', async () => {
  const id = new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 344, height: 560 });
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForTimeout(300);
  await popup.screenshot({ path: path.join(shots, 'popup.png') });
  await popup.close();
});

await step('renders every gallery example as a nonempty SVG', async () => {
  await page.goto('https://github.com/mermaid-lens-test/gallery');
  await Promise.all(samples.map(async ({ key }) => {
    const svg = page.locator(`#type-${key} mermaid-lens-viewer .ml-svg`);
    await svg.waitFor({ timeout: 20000 });
    const { width, height } = await svg.evaluate((el) => {
      const box = el.getBBox();
      return { width: box.width, height: box.height };
    });
    assert.ok(width > 0 && height > 0, `${key} has visible content`);
  }));
  assert.equal(await page.locator('#type-zenuml .ml-svg').getAttribute('aria-roledescription'), 'zenuml');
  assert.match(await page.locator('#type-zenuml .ml-svg').textContent(), /Alice/);
});

await step('finds source blocks and pre-rendered diagrams in documentation-site markup', async () => {
  const keys = ['pre-mermaid', 'div-mermaid', 'code-language', 'pre-lang', 'rouge', 'shiki', 'expressive-code', 'chroma', 'page-rendered'];
  await Promise.all(keys.map(async (key) => {
    const viewer = page.locator(`#site-${key} mermaid-lens-viewer`);
    await viewer.waitFor({ timeout: 10000 });
    assert.equal(await viewer.count(), 1, key);
    assert.match(await viewer.locator('.ml-svg').textContent(), /Write docs|GET \/docs/, key);
  }));
  assert.equal(await page.locator('#site-closed-shadow mermaid-lens-viewer').count(), 0);
  await page.locator('#add-diagram').click();
  const svg = page.locator('#dynamic-slot mermaid-lens-viewer .ml-svg');
  await svg.waitFor({ timeout: 10000 });
  assert.match(await svg.textContent(), /Added #1/);
});

await step('sequence highlighting selects an exchange, a decision, or one nested alternative', async () => {
  const sequence = page.locator('#type-sequence mermaid-lens-viewer');
  const message = (label) => sequence.locator('.messageText').getByText(label, { exact: true });
  const guard = (label) => sequence.getByText(`[${label}]`, { exact: true });
  const lit = () => sequence.locator('.messageText.ml-on').allTextContents();
  await setStorage({ highlight: true, highlightMode: 'neighbors', direction: 'both' });
  await sequence.locator('[data-act="cycle-highlight"][data-state="neighbors"]').waitFor();

  const guardWeights = () => sequence.locator('text.ml-sequence-guard').evaluateAll((labels) =>
    labels.map((label) => getComputedStyle(label).fontWeight),
  );
  const originalWeights = await guardWeights();
  assert.ok(originalWeights.length > 0);
  await guard('cache hit').hover();
  assert.deepEqual(await lit(), ['Render cached']);
  assert.deepEqual(await guardWeights(), originalWeights);

  await message('GET /items').hover();
  assert.deepEqual(await lit(), ['GET /items']);
  assert.equal(await sequence.locator('.ml-edge.ml-on').count(), 1);
  assert.deepEqual(await sequence.locator('line.actor-line.ml-on').evaluateAll((lines) => lines.map((line) => line.getAttribute('name'))), ['A', 'W']);

  const outerDecision = sequence.locator('g[data-et="control-structure"]').filter({ hasText: /cache hit/ });
  await outerDecision.locator('.labelText').click();
  assert.deepEqual(await lit(), ['Render cached', 'Refresh items', 'Updated items', 'Load items', 'Fresh items', 'Render fresh']);
  await guard('cache hit').click();
  assert.deepEqual(await lit(), ['Render cached']);
  await guard('no entry').click({ modifiers: ['Shift'] });
  assert.deepEqual(await lit(), ['Render cached', 'Load items', 'Fresh items']);
  await sequence.locator('.frame').press('Escape');

  await setStorage({ highlightMode: 'flow', direction: 'both' });
  await sequence.locator('[data-act="cycle-highlight"][data-state="flow"]').waitFor();
  await guard('no entry').click();
  assert.deepEqual(await lit(), ['Open page', 'GET /items', '200 OK', 'Load items', 'Fresh items', 'Render fresh', 'Confirm page']);
  assert.deepEqual(await guardWeights(), originalWeights);
  await sequence.screenshot({ path: path.join(shots, 'sequence-highlight.png') });
  await setStorage({ direction: 'down' });
  await sequence.locator('[data-act="set-direction"][data-val="down"][aria-checked="true"]').waitFor({ state: 'attached' });
  assert.deepEqual(await lit(), ['Load items', 'Fresh items', 'Render fresh', 'Confirm page']);
  await sequence.locator('.frame').press('Escape');
  await page.mouse.move(5, 5);
  await sequence.locator('svg.ml-has-hl').waitFor({ state: 'detached' });
});

if (process.argv.includes('--live')) {
  await step('real GitHub README (network)', async () => {
    await page.goto('https://github.com/mermaid-js/mermaid/blob/develop/README.md');
    await viewers.first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(3000);
    const count = await viewers.count();
    const sections = await page.locator('section[data-type="mermaid"]').count();
    console.log(`    ${count} viewers for ${sections} diagrams`);
    assert.equal(count, sections);
    assert.deepEqual(await clippedLabels(), []);
    await viewers.first().scrollIntoViewIfNeeded();
    await viewers.first().hover();
    await page.waitForTimeout(300);
    await viewers.first().screenshot({ path: path.join(shots, 'live-github.png') });
  });
}

const relevant = errors.filter((e) => !/github\.com|Failed to load resource/.test(e));
assert.deepEqual(relevant, [], 'no page errors');
console.log(`\n${passed} checks passed. Screenshots in test/screenshots/`);
await context.close();
