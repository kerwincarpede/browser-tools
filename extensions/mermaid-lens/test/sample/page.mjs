// Builds the local sample page: every Mermaid diagram type in GitHub's markup, plus the
// markup other sites (docs generators, code hosts, highlighters) use for Mermaid blocks.
import { samples } from '../fixtures/all-types.mjs';
import { githubSection } from '../fixtures/diagrams.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SMALL = `flowchart LR
  A[Write docs] --> B{Has diagram?}
  B -->|yes| C[Mermaid Lens]
  B -->|no| D[Plain page]
  C --> E[Pan, zoom, highlight]`;

const SEQ = `sequenceDiagram
  Browser->>Server: GET /docs
  Server-->>Browser: HTML with a mermaid block
  Browser->>Browser: Render diagram`;

/** Per-line spans, the way syntax highlighters emit code. */
const lines = (code, wrap) => code.split('\n').map(wrap).join('\n');

// Markup used by sites other than GitHub.
const otherSites = [
  {
    key: 'pre-mermaid',
    title: 'pre.mermaid (mermaid.js convention, not yet rendered)',
    where: 'Static sites that call mermaid.run() later, or where the script failed to load',
    html: `<pre class="mermaid">${esc(SMALL)}</pre>`,
  },
  {
    key: 'div-mermaid',
    title: 'div.mermaid (mermaid.js convention, not yet rendered)',
    where: 'Hugo/Jekyll shortcodes, Azure DevOps-style ::: mermaid, hand-written HTML',
    html: `<div class="mermaid">${esc(SMALL)}</div>`,
  },
  {
    key: 'code-language',
    title: 'pre > code.language-mermaid',
    where: 'markdown-it, marked, Prism, highlight.js, Gitea/Forgejo, many SSGs',
    html: `<pre><code class="language-mermaid">${esc(SMALL)}</code></pre>`,
  },
  {
    key: 'pre-lang',
    title: 'pre[lang="mermaid"]',
    where: 'GitLab, Gitea, GitHub before enrichment',
    html: `<pre lang="mermaid"><code>${esc(SEQ)}</code></pre>`,
  },
  {
    key: 'rouge',
    title: 'Jekyll / kramdown + Rouge (GitHub Pages)',
    where: 'div.language-mermaid.highlighter-rouge > div.highlight > pre.highlight > code',
    html: `<div class="language-mermaid highlighter-rouge"><div class="highlight"><pre class="highlight"><code>${esc(SMALL)}</code></pre></div></div>`,
  },
  {
    key: 'shiki',
    title: 'VitePress / Shiki',
    where: 'div.language-mermaid > pre.shiki > code > span.line',
    html: `<div class="language-mermaid vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">mermaid</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code>${lines(
      SMALL,
      (l) => `<span class="line"><span style="--shiki-light:#24292E">${esc(l)}</span></span>`,
    )}</code></pre></div>`,
  },
  {
    key: 'expressive-code',
    title: 'Astro Starlight / Expressive Code',
    where: 'pre[data-language="mermaid"], one div per line (no newline characters)',
    html: `<div class="expressive-code"><figure class="frame not-content"><pre data-language="mermaid"><code>${SMALL.split('\n')
      .map((l) => `<div class="ec-line"><div class="code">${esc(l)}</div></div>`)
      .join('')}</code></pre></figure></div>`,
  },
  {
    key: 'chroma',
    title: 'Hugo / Chroma',
    where: 'div.highlight > pre.chroma > code.language-mermaid[data-lang]',
    html: `<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-mermaid" data-lang="mermaid">${lines(
      SMALL,
      (l) => `<span class="line"><span class="cl">${esc(l)}\n</span></span>`,
    ).replace(/\n\n/g, '\n')}</code></pre></div>`,
  },
  {
    key: 'page-rendered',
    title: 'Rendered by the page with mermaid.js (Docusaurus / Obsidian Publish style)',
    where: 'The page draws its own SVG; Mermaid Lens adopts it (no source code, so no "Copy code")',
    html: `<div class="docusaurus-mermaid-container" data-render="${esc(SMALL)}"></div>`,
  },
  {
    key: 'closed-shadow',
    title: 'Rendered into a closed shadow root (MkDocs Material, simulated)',
    where: 'Material draws the SVG inside a closed shadow root, so Mermaid Lens cannot access it',
    html: `<div class="mermaid" data-closed-shadow="${esc(SMALL)}"></div>`,
  },
  {
    key: 'details',
    title: 'Inside a collapsed <details>',
    where: 'READMEs and docs that fold big diagrams away',
    html: `<details><summary>Show diagram</summary>${githubSection(SMALL)}</details>`,
  },
];

export function samplePage() {
  const typeCards = samples
    .map((s) => `<section class="card" id="type-${s.key}" data-github="${s.github ? 'yes' : 'no'}">
  <header><h3>${esc(s.title)}</h3></header>
  ${githubSection(s.code)}
  <details class="src"><summary>Source</summary><pre class="raw">${esc(s.code)}</pre></details>
</section>`)
    .join('\n');

  const siteCards = otherSites
    .map(
      (o) => `<section class="card" id="site-${o.key}">
  <header><h3>${esc(o.title)}</h3></header>
  <p class="where">${esc(o.where)}</p>
  ${o.html}
</section>`,
    )
    .join('\n');

  const nav = samples.map((s) => `<a href="#type-${s.key}">${esc(s.title)}</a>`).join('');

  return `<!doctype html>
<html lang="en" data-color-mode="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mermaid Lens sample page</title>
<style>
:root { --bg:#ffffff; --fg:#1f2328; --muted:#59636e; --line:#d1d9e0; --card:#f6f8fa; --accent:#6366f1;
  --good:#1a7f37; --good-bg:#dafbe1; --bad:#cf222e; --bad-bg:#ffebe9; --chip:#eaeef2; }
html[data-color-mode="dark"] { --bg:#0d1117; --fg:#e6edf3; --muted:#9198a1; --line:#30363d; --card:#151b23;
  --good:#3fb950; --good-bg:#12261e; --bad:#f85149; --bad-bg:#2d1214; --chip:#212830; }
@media (prefers-color-scheme: dark) { html[data-color-mode="auto"] { --bg:#0d1117; --fg:#e6edf3; --muted:#9198a1; --line:#30363d; --card:#151b23;
  --good:#3fb950; --good-bg:#12261e; --bad:#f85149; --bad-bg:#2d1214; --chip:#212830; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif; }
/* GitHub's Primer CSS has this; it used to skew Mermaid's label measurements. Keep it to catch regressions. */
.label { font-size:12px; font-weight:500; padding:0 7px; line-height:18px; }
.top { position:sticky; top:0; z-index:5; background:var(--bg); border-bottom:1px solid var(--line); padding:12px 24px; display:flex; gap:16px; align-items:center; flex-wrap:wrap; }
.top h1 { font-size:16px; margin:0; }
.top .spacer { flex:1; }
.seg { display:inline-flex; border:1px solid var(--line); border-radius:6px; overflow:hidden; }
.seg button { background:none; border:0; color:var(--fg); padding:4px 10px; font:inherit; cursor:pointer; }
.seg button[aria-pressed="true"] { background:var(--accent); color:#fff; }
main { max-width:1000px; margin:0 auto; padding:24px; }
.intro { color:var(--muted); }
.intro code, .where code { background:var(--chip); padding:1px 5px; border-radius:4px; }
.intro ol { padding-left:20px; }
nav.types { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0 4px; }
nav.types a { background:var(--chip); color:var(--fg); text-decoration:none; padding:2px 8px; border-radius:999px; font-size:12px; }
h2 { margin:40px 0 4px; padding-bottom:6px; border-bottom:1px solid var(--line); }
.card { border:1px solid var(--line); border-radius:8px; padding:16px; margin:16px 0; scroll-margin-top:70px; }
.card header { display:flex; justify-content:space-between; gap:12px; align-items:baseline; flex-wrap:wrap; margin-bottom:8px; }
.card h3 { margin:0; font-size:15px; }
.where { color:var(--muted); margin:0 0 10px; font-size:13px; }
pre { background:var(--card); padding:12px; border-radius:6px; overflow:auto; font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace; }
div.mermaid { white-space:pre; background:var(--card); padding:12px; border-radius:6px; font:12px/1.45 ui-monospace,Menlo,monospace; }
details.src summary { cursor:pointer; color:var(--muted); font-size:12px; }
html.hide-new [data-github="no"] { display:none; }
.status { margin:16px 0; padding:12px 16px; border-radius:8px; border:1px solid var(--line); background:var(--card); }
.status.good { border-color:var(--good); background:var(--good-bg); color:var(--good); }
.status.bad { border-color:var(--bad); background:var(--bad-bg); color:var(--fg); }
.status.bad strong { color:var(--bad); }
.status ol { margin:6px 0 0; padding-left:20px; }
label.toggle { color:var(--muted); font-size:13px; display:inline-flex; gap:6px; align-items:center; }
#dynamic-slot:empty::before { content:"Nothing added yet."; color:var(--muted); }
</style>
</head>
<body>
<div class="top">
  <h1>Mermaid Lens sample page</h1>
  <span class="spacer"></span>
  <label class="toggle"><input type="checkbox" id="only-github"> Common GitHub examples only</label>
  <div class="seg" role="group" aria-label="Page theme">
    <button data-mode="light" aria-pressed="true">Light</button><button data-mode="dark" aria-pressed="false">Dark</button><button data-mode="auto" aria-pressed="false">Auto</button>
  </div>
</div>
<main>
  <div class="status" id="lens-status" role="status">Waiting for Mermaid Lens…</div>
  <div class="intro">
    <p>Diagrams in the markup GitHub and other sites use, for checking Mermaid Lens by hand. Hover a rendered diagram to try its viewer controls.</p>
    <ol>
      <li>Build and load the extension: <code>npm run build -w mermaid-lens</code>, then <em>Load unpacked</em> → <code>extensions/mermaid-lens/dist</code>.</li>
      <li>Open this page, click the Mermaid Lens icon and turn it on for <code>localhost</code> (Chrome asks for access once).</li>
      <li>Reload the page. Every diagram the extension picks up gets the hover toolbar and the toolbar badge counts them.</li>
    </ol>
    <p>The theme switch sets <code>data-color-mode</code> on <code>&lt;html&gt;</code> like GitHub does, so you can check that diagrams re-render in dark mode.</p>
  </div>

  <h2 id="types">Every diagram type, GitHub markup</h2>
  <p class="where">Each block uses the <code>section[data-type="mermaid"]</code> markup GitHub serves for a <code>\`\`\`mermaid</code> fence.</p>
  <nav class="types">${nav}</nav>
  ${typeCards}

  <h2 id="sites">Markup from other sites</h2>
  <p class="where">The same small diagram in the shapes other code hosts, static site generators and highlighters produce.</p>
  ${siteCards}

  <section class="card" id="site-dynamic">
    <header><h3>Added after page load (single-page apps)</h3></header>
    <p class="where">Appends a <code>pre &gt; code.language-mermaid</code> block, the way client-side rendered docs do.</p>
    <button id="add-diagram" type="button">Add a diagram</button>
    <div id="dynamic-slot"></div>
  </section>
</main>

<script src="/vendor/mermaid.min.js"></script>
<script>
(() => {
  const html = document.documentElement;
  const buttons = document.querySelectorAll('.seg button');
  const setMode = (mode) => {
    html.setAttribute('data-color-mode', mode); // 'auto' follows the OS, as on GitHub
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    try { localStorage.setItem('ml-sample-mode', mode); } catch {}
  };
  buttons.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  let saved = 'light';
  try { saved = localStorage.getItem('ml-sample-mode') || 'light'; } catch {}
  setMode(saved);

  const only = document.getElementById('only-github');
  only.addEventListener('change', () => html.classList.toggle('hide-new', only.checked));

  let n = 0;
  document.getElementById('add-diagram').addEventListener('click', () => {
    n++;
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.className = 'language-mermaid';
    code.textContent = 'flowchart LR\\n  X' + n + '[Added #' + n + '] --> Y' + n + '[Picked up?]';
    pre.append(code);
    document.getElementById('dynamic-slot').append(pre);
  });

  // Tell the tester whether the extension picked the page up; without it the
  // GitHub-style blocks only show their raw source.
  const status = document.getElementById('lens-status');
  const total = document.querySelectorAll('section[data-type="mermaid"]').length;
  const report = (final) => {
    const n = document.querySelectorAll('mermaid-lens-viewer').length;
    if (n > 0) {
      status.className = 'status good';
      status.textContent = 'Mermaid Lens is running: ' + n + ' diagrams enhanced (' + total + ' GitHub-style blocks on the page).';
    } else if (final) {
      status.className = 'status bad';
      status.innerHTML = '<strong>Mermaid Lens isn\u2019t running on this page</strong>, so the diagram blocks below only show their source.' +
        '<ol><li>Check the extension is loaded and enabled at <code>edge://extensions</code> (or <code>chrome://extensions</code>).</li>' +
        '<li>Click the Mermaid Lens icon (it may be under the puzzle-piece menu) and switch it on for <code>' + location.hostname + '</code>; allow access when asked.</li>' +
        '<li>Reload this page.</li></ol>';
    }
  };
  // Poll rather than observe: updating the banner is itself a DOM mutation.
  let ticks = 0;
  const poll = setInterval(() => {
    ticks++;
    report(ticks >= 5);
    if (ticks >= 60) clearInterval(poll);
  }, 1000);

  // The page renders these itself, like docs sites that bundle mermaid.js.
  if (!window.mermaid) return;
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
  let i = 0;
  (async () => {
    for (const el of document.querySelectorAll('[data-render]')) {
      const { svg } = await mermaid.render('mermaid-svg-' + i++, el.dataset.render);
      el.innerHTML = svg;
    }
    for (const el of document.querySelectorAll('[data-closed-shadow]')) {
      const { svg } = await mermaid.render('mermaid-' + i++, el.dataset.closedShadow);
      el.setAttribute('data-processed', 'true');
      el.textContent = '';
      el.attachShadow({ mode: 'closed' }).innerHTML = svg;
    }
  })();
})();
</script>
</body>
</html>`;
}
