import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { githubSection } from '../test/fixtures/diagrams.mjs';

const checkout = `---
config:
  fontSize: 24
  sequence:
    width: 126
    height: 36
    actorMargin: 115
    actorFontWeight: 600
    messageMargin: 5
    labelBoxHeight: 24
    diagramMarginY: 10
    boxMargin: 9
    boxTextMargin: 12
    mirrorActors: true
    bottomMarginAdj: 12
---
sequenceDiagram
    participant B as Buyer
    participant O as Box office
    participant P as Payments
    B->>O: Reserve seats
    alt Card payment
        O->>P: Authorize card
        alt Approved
            P-->>O: Payment confirmed
        else Declined
            P-->>O: Payment declined
        end
    else Voucher payment
        B->>O: Redeem voucher
    end
    O-->>B: Show order status`;

const delivery = `---
config:
  theme: base
  themeVariables:
    primaryColor: '#eef2ff'
    primaryTextColor: '#1e2352'
    primaryBorderColor: '#818cf8'
    lineColor: '#6366a1'
    fontSize: '19px'
  flowchart:
    curve: basis
    nodeSpacing: 26
    rankSpacing: 45
---
flowchart LR
    A([New order]) --> B{In stock?}
    B -->|Yes| C[Reserve items] --> D[Pack parcel] --> E([Dispatch])
    B -->|No| F[Join waitlist] --> G([Notify customer])
    classDef endpoint fill:#d1faed,color:#064e3b,stroke:#34b99b
    classDef decision fill:#e0e7ff,color:#312e81,stroke:#6366f1
    class A,E,G endpoint
    class B decision`;

const release = `---
config:
  theme: base
  themeVariables:
    primaryColor: '#dbfbf3'
    primaryTextColor: '#0c3a39'
    primaryBorderColor: '#4caaa2'
    lineColor: '#367c7a'
    fontSize: '17px'
  flowchart:
    nodeSpacing: 20
    rankSpacing: 36
---
flowchart TB
    A([Commit]) --> B[Run checks]
    B --> C[Build app]
    B --> D[Run tests]
    C --> E([Deploy])
    D --> E
    classDef endNode fill:#ede9fe,color:#312e81,stroke:#8b78d5
    class A,E endNode`;

const ticket = `---
config:
  theme: base
  themeVariables:
    primaryColor: '#ede9fe'
    primaryTextColor: '#31225d'
    primaryBorderColor: '#9277e1'
    lineColor: '#71639c'
    fontSize: '17px'
  flowchart:
    nodeSpacing: 22
    rankSpacing: 38
---
flowchart TB
    A([Order paid]) --> B[Issue tickets] --> C[Create PDF] --> D([Send email])
    classDef step fill:#dcebf9,color:#1d3a59,stroke:#70a1cc
    class B,C step`;

const stageStyles = `
* { box-sizing: border-box; }
body { margin: 0; width: 1280px; height: 800px; overflow: hidden;
  font: 22px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.stage { position: relative; isolation: isolate; width: 100%; height: 100%; color: var(--ink);
  background: var(--background); overflow: hidden; }
.stage::before { content: ""; position: absolute; inset: 0; z-index: -1;
  background-image: radial-gradient(var(--dot) 1px, transparent 1px);
  background-size: 24px 24px; mask-image: linear-gradient(112deg, transparent 19%, #000 72%); }
.route { --ink: #faf8ff; --muted: #d6caf7; --accent: #ffc568; --dot: #c3aff533;
  --background: radial-gradient(ellipse at 85% 80%, #6946b7 0%, transparent 56%),
    linear-gradient(135deg, #14102d 10%, #2b1b55 56%, #462e83); }
.zoom { --ink: #1a1744; --muted: #48466f; --accent: #5543b2; --dot: #7b62c32e;
  --background: radial-gradient(ellipse at 88% 67%, #ccbbff, transparent 57%),
    linear-gradient(140deg, #f5f1ff 8%, #e8e1ff 55%, #d9d2ff); }
.replay { --ink: #f0fffc; --muted: #c0e6e4; --accent: #82ead6; --dot: #acffed32;
  --background: radial-gradient(ellipse at 75% 100%, #1b777a, transparent 66%),
    linear-gradient(140deg, #0a2229 8%, #103a46 56%, #145764); }
.share { --ink: #21183e; --muted: #524468; --accent: #6241aa; --dot: #a161b934;
  --background: radial-gradient(ellipse at 96% 62%, #e1c2ff, transparent 57%),
    linear-gradient(139deg, #fff5ed 5%, #f6e8fa 48%, #e8cbfa); }
.brand { position: absolute; top: 59px; left: 64px; display: flex; align-items: center;
  gap: 10px; font-size: 22px; font-weight: 680; letter-spacing: -.02em; }
.brand img { width: 39px; height: 39px; }
.copy { position: absolute; left: 64px; top: 145px; }
.copy .tagline { position: absolute; bottom: calc(100% + 13px); margin: 0;
  font-size: 20px; font-weight: 650; }
.copy h1 { margin: 0; font-size: 66px; font-weight: 710; line-height: 1.02;
  letter-spacing: -.036em; }
.copy h1 em { display: block; color: var(--accent); font-style: normal; }
.copy p { margin: 21px 0 0; color: var(--muted); font-size: 23px; line-height: 1.38; }
.split .copy { top: 241px; width: 420px; }
.split h1 { font-size: 76px; }
.split .copy p { max-width: 330px; }
.card { overflow: hidden; background: #fff; border: 1px solid #19123721; border-radius: 18px;
  box-shadow: 0 24px 66px #18082b35, 0 5px 14px #18082b18; }
.card.dark { background: #0d1117; border-color: #faf0ff38; box-shadow: 0 28px 75px #12072585; }
.card-title { height: 49px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 18px; border-bottom: 1px solid #e5e3ef; background: #f7f6fb;
  color: #262444; font-size: 15px; font-weight: 660; }
.dark .card-title { background: #171927; border-color: #292a3b; color: #edeaf8; }
.card-title small { font-size: 13px; color: #5c5772; font-weight: 550; }
.dark .card-title small { color: #bfb6d2; }
.capture { display: block; width: 100%; height: auto; }
.split .card { position: absolute; top: 50%; right: 63px; transform: translateY(-50%); }
.route .card { width: 744px; }
.share .card { width: 712px; }
.zoom .card { position: absolute; width: 1152px; top: 285px; left: 64px; }
.replay .pair { position: absolute; top: 289px; left: 64px; right: 64px; display: grid;
  grid-template-columns: 1fr 1fr; gap: 24px; }
`;

const card = (capture, title = '', detail = '', dark = false) => `<section class="card${dark ? ' dark' : ''}">
${title ? `<div class="card-title">${title}<small>${detail}</small></div>` : ''}
<img class="capture" src="data:image/png;base64,${capture.toString('base64')}">
</section>`;

function poster({ theme, tagline, title, body, content, split = false }, icon) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${stageStyles}</style></head>
<body><main class="stage ${theme}${split ? ' split' : ''}">
<div class="brand"><img src="${icon}" alt="">Mermaid Lens</div>
<div class="copy">${tagline ? `<p class="tagline">${tagline}</p>` : ''}<h1>${title}</h1><p>${body}</p></div>
${content}
</main></body></html>`;
}

export async function storeScreenshots(context, { root, out, primaryOnly }) {
  const icon = `data:image/png;base64,${(await readFile(path.join(root, 'icons/icon-128.png'))).toString('base64')}`;
  const host = 'https://github.com/lantern-stage/store-demos/blob/main/';
  const fixtures = new Map([
    ['checkout.md', { dark: true, source: checkout }],
    ['delivery.md', { source: delivery }],
    ['release.md', { source: release }],
    ['tickets.md', { source: ticket }],
  ]);
  await context.route(`${host}*`, (route) => {
    const { dark, source } = fixtures.get(new URL(route.request().url()).pathname.split('/').at(-1));
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html>
<html data-color-mode="${dark ? 'dark' : 'light'}"><head><meta charset="utf-8">
<style>body { margin: 0; background: ${dark ? '#0d1117' : '#fff'}; }</style></head>
<body>${githubSection(source)}</body></html>` });
  });

  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const settings = (options) => worker.evaluate((values) => chrome.storage.sync.set(values), options);
  const page = await context.newPage();
  const stage = await context.newPage();
  await stage.setViewportSize({ width: 1280, height: 800 });
  const viewer = page.locator('mermaid-lens-viewer');
  const frame = viewer.locator('.frame');
  const control = (name) => viewer.locator(`[data-act="${name}"]`);
  const open = async (file, width, height) => {
    await page.bringToFront();
    await page.setViewportSize({ width, height });
    await page.goto(host + file);
    await viewer.locator('.ml-svg').waitFor();
    await viewer.hover({ position: { x: 12, y: 80 } });
    await viewer.locator('.toolbar').waitFor();
    await page.waitForTimeout(200);
  };
  const pan = async (dx, dy) => {
    await page.mouse.move(75, 120);
    await page.mouse.down();
    await page.mouse.move(75 + dx, 120 + dy, { steps: 6 });
    await page.mouse.up();
  };
  const paint = async (file, design) => {
    await stage.setContent(poster(design, icon));
    await stage.locator('img').evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
    await stage.screenshot({ path: path.join(out, file), scale: 'css' });
  };

  try {
    await settings({ highlight: true, highlightMode: 'flow', highlightColor: '#fbbf24', direction: 'both' });
    await open('checkout.md', 742, 775);
    // Make room for the floating controls at the top and bottom.
    await pan(-46, 36);
    await viewer.getByText('[Approved]', { exact: true }).click();
    await page.mouse.move(12, 80);
    await page.waitForTimeout(250);
    assert.deepEqual(await viewer.locator('.messageText.ml-on').allTextContents(),
      ['Reserve seats', 'Authorize card', 'Payment confirmed', 'Show order status']);
    await paint('screenshot-1-highlight-flow.png', {
      theme: 'route', split: true, title: 'Trace the<br><em>right path.</em>',
      tagline: 'Take control of GitHub diagrams.',
      body: 'Pin a route through nested decisions and dim the rest.',
      content: card(await viewer.screenshot(), 'checkout.md', 'Card payment → Approved', true),
    });
    if (primaryOnly) return;

    await settings({ highlight: false });
    await open('delivery.md', 1150, 443);
    await control('fullscreen').click();
    await page.waitForFunction(() => document.fullscreenElement?.localName === 'mermaid-lens-viewer');
    await page.mouse.move(12, 80);
    await page.waitForTimeout(250);
    await paint('screenshot-2-fullscreen.png', {
      theme: 'zoom', title: 'Big diagrams. Room to breathe.',
      body: 'Go full screen and zoom into the details.',
      content: card(await page.screenshot()),
    });

    await open('release.md', 562, 700);
    await pan(-42, 0);
    await page.mouse.move(12, 80);
    const complete = await viewer.screenshot();
    await control('replay').click();
    await page.mouse.move(12, 80);
    await page.waitForFunction(() => {
      const root = document.querySelector('mermaid-lens-viewer')?.shadowRoot;
      const nodes = [...root.querySelectorAll('g.node')];
      const opacity = (label) => getComputedStyle(nodes.find((node) => node.textContent.includes(label))).opacity;
      return Number(opacity('Run checks')) > 0.9 && Number(opacity('Deploy')) < 0.1;
    });
    const playing = await viewer.screenshot();
    await paint('screenshot-3-animation.png', {
      theme: 'replay', title: 'Watch the flow take shape.',
      body: 'Replay how a diagram builds, step by step.',
      content: `<div class="pair">${card(playing, 'During replay')}${card(complete, 'Complete')}</div>`,
    });

    await open('tickets.md', 566, 800);
    // Keep the flowchart visible alongside the real export menu.
    await frame.press('ArrowRight');
    await frame.press('ArrowRight');
    await frame.press('ArrowRight');
    await control('pop-copy').click();
    await viewer.locator('[data-pop="copy"].open').waitFor();
    await page.mouse.move(12, 80);
    await page.waitForTimeout(250);
    await paint('screenshot-4-copy-export.png', {
      theme: 'share', split: true, title: 'Take it<br><em>with you.</em>',
      body: 'Copy Mermaid source or export as PNG or SVG.',
      content: card(await viewer.screenshot(), 'tickets.md'),
    });
  } finally {
    await page.close();
    await stage.close();
    await context.unroute(`${host}*`);
  }
}
