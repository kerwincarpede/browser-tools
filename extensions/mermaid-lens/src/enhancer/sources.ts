/**
 * Finds Mermaid diagrams on the page. Each result names the element we hide
 * (`anchor`) and either the Mermaid source to render or an SVG the page
 * already rendered.
 */

export interface DiagramSource {
  anchor: HTMLElement | SVGSVGElement;
  code?: string;
  /** Already-rendered diagram (non-GitHub sites); cloned, never moved. */
  svg?: SVGSVGElement;
}

const HOST_TAG = 'mermaid-lens-viewer';

function insideManaged(el: Element, managed: Set<Element>): boolean {
  for (let cur: Element | null = el; cur; cur = cur.parentElement) {
    if (managed.has(cur) || cur.localName === HOST_TAG) return true;
  }
  return false;
}

function githubSource(section: HTMLElement): string | undefined {
  const target = section.querySelector<HTMLElement>('.js-render-enrichment-target');
  if (target?.dataset.plain) return target.dataset.plain;
  try {
    const data = JSON.parse(target?.dataset.json ?? '').data;
    if (typeof data === 'string') return data;
  } catch {
    /* fall through */
  }
  return section.querySelector('pre')?.textContent ?? undefined;
}

export function findDiagrams(managed: Set<Element>): DiagramSource[] {
  const found: DiagramSource[] = [];
  const claim = (s: DiagramSource) => {
    if (insideManaged(s.anchor, managed)) return;
    if (s.code !== undefined && !s.code.trim()) return;
    managed.add(s.anchor);
    found.push(s);
  };

  // GitHub (markdown files, READMEs, issues, PRs, discussions, wikis, gists).
  for (const section of document.querySelectorAll<HTMLElement>('section[data-type="mermaid"]')) {
    claim({ anchor: section, code: githubSource(section) });
  }

  // Unrendered fenced code blocks (GitLab, Gitea, Bitbucket, many static sites).
  for (const el of document.querySelectorAll<HTMLElement>('pre[lang="mermaid"], code.language-mermaid, pre.mermaid')) {
    if (el.closest('section[data-type="mermaid"]') || el.querySelector('svg')) continue;
    if (el.closest('[contenteditable="true"], textarea')) continue;
    const anchor = (el.localName === 'code' ? el.closest('pre') : el) ?? el;
    claim({ anchor, code: el.textContent ?? '' });
  }

  // Diagrams the page rendered itself (docs sites using mermaid.js directly).
  for (const svg of document.querySelectorAll<SVGSVGElement>('svg[aria-roledescription]')) {
    const mermaidish = /mermaid/i.test(svg.id) || svg.closest('.mermaid, [class*="mermaid"]');
    if (!mermaidish || !svg.isConnected) continue;
    claim({ anchor: svg, svg });
  }

  return found;
}

export { HOST_TAG };
