export const diagrams = {
  flow: `flowchart LR
  A[Start] --> B{Is it?}
  B -->|Yes| C[OK]
  B -- No --> D[Not OK]
  subgraph sub_1 [Sub]
    C --> E((End))
  end
  D --> sub_1
  E --> F[Done]`,
  sequence: `sequenceDiagram
  Alice->>Bob: Hello Bob
  Bob-->>Alice: Hi Alice
  Alice->>Bob: How are you?`,
  state: `stateDiagram-v2
  [*] --> Still
  Still --> Moving : go
  Moving --> Crash
  Crash --> [*]`,
  klass: `classDiagram
  Animal <|-- Duck
  Animal <|-- Fish
  Animal : +int age
  Duck : +swim()`,
  git: `gitGraph
  commit
  branch develop
  checkout develop
  commit
  checkout main
  merge develop`,
  showcase: `flowchart TB
  user([User]) --> web[Web app]
  web --> api{{API gateway}}
  subgraph services [Services]
    api --> auth[Auth service]
    api --> orders[Orders service]
    api --> search[Search service]
  end
  auth --> users[(Users DB)]
  orders --> queue[[Event queue]]
  orders --> ordersdb[(Orders DB)]
  queue --> mailer[Email worker]
  queue --> analytics[Analytics]
  search --> index[(Search index)]`,
  broken: `flowchart TD
  A -->`,
};

const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Markup shaped like GitHub's rendered markdown for ```mermaid blocks. */
export function githubSection(code) {
  return `<section class="js-render-needs-enrichment render-needs-enrichment position-relative" data-type="mermaid" aria-label="mermaid rendered output container" style="margin-bottom:16px">
  <div class="js-render-enrichment-target" data-plain="${escAttr(code)}" dir="auto">
    <div class="render-plaintext-hidden" dir="auto"><pre lang="mermaid" aria-label="Raw mermaid code">${escText(code)}</pre></div>
  </div>
  <span class="js-render-enrichment-loader">Loading…</span>
</section>`;
}

/** A single-diagram page used for store screenshots. */
export function showcasePage(mode = 'light') {
  const bg = mode === 'dark' ? '#0d1117' : '#ffffff';
  const fg = mode === 'dark' ? '#e6edf3' : '#1f2328';
  const muted = mode === 'dark' ? '#9198a1' : '#59636e';
  const line = mode === 'dark' ? '#30363d' : '#d1d9e0';
  return `<!doctype html><html data-color-mode="${mode}"><head><meta charset="utf-8"><title>architecture.md</title>
<style>body{margin:0;background:${bg};color:${fg};font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.bar{display:flex;align-items:center;gap:8px;padding:14px 32px;border-bottom:1px solid ${line};color:${muted}}
.bar b{color:${fg}}.markdown-body{max-width:1100px;margin:20px auto;padding:0 32px}
h1{font-size:28px;margin:0 0 6px;padding-bottom:8px;border-bottom:1px solid ${line}}p{color:${muted};margin:0 0 20px}
.label{font-size:12px}</style></head>
<body><div class="bar">acme / shop / docs / <b>architecture.md</b></div><article class="markdown-body">
<h1>System architecture</h1><p>How a request flows through the platform.</p>
${githubSection(diagrams.showcase)}
</article></body></html>`;
}

export function githubPage(mode = 'light') {
  const bg = mode === 'dark' ? '#0d1117' : '#ffffff';
  const fg = mode === 'dark' ? '#e6edf3' : '#1f2328';
  return `<!doctype html><html data-color-mode="${mode}"><head><meta charset="utf-8"><title>fixture</title>
<style>body{margin:0;background:${bg};color:${fg};font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.markdown-body{max-width:880px;margin:24px auto;padding:0 24px}
/* GitHub's Primer CSS has this, and it used to skew Mermaid's label measurements */
.label{font-size:12px;font-weight:500;padding:0 7px;line-height:18px}</style></head>
<body><article class="markdown-body">
<h2>Flowchart</h2>${githubSection(diagrams.flow)}
<h2>Sequence</h2>${githubSection(diagrams.sequence)}
<h2>State</h2>${githubSection(diagrams.state)}
<h2>Class</h2>${githubSection(diagrams.klass)}
<h2>Git graph</h2>${githubSection(diagrams.git)}
<h2>Broken</h2>${githubSection(diagrams.broken)}
<p style="height:600px">end</p>
</article></body></html>`;
}
