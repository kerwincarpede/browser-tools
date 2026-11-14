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
