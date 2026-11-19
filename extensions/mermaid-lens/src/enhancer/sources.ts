/**
 * Finds Mermaid diagrams on the page. Each result names the element we hide
 * (`anchor`) and either the Mermaid source to render or an SVG the page
 * already rendered.
 */
import { MERMAID_SOURCE_SELECTOR, MERMAID_SVG_SELECTOR } from '../shared/settings';

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

function codeText(el: HTMLElement): string {
  const code = el.querySelector('code') ?? el;
  // Some syntax highlighters put every line in a separate element without
  // adding line breaks. Indentation and line breaks are significant to Mermaid.
  const lines = [...code.querySelectorAll(':scope > .line, :scope > .ec-line > .code')];
  if (!lines.length) return code.textContent ?? '';
  return lines.map((line) => line.textContent?.replace(/\r?\n$/, '') ?? '').join('\n');
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
    const code = githubSource(section);
    if (code !== undefined) claim({ anchor: section, code });
  }

  // Unrendered fenced code blocks (GitLab, Gitea, Bitbucket, many static sites).
  for (const el of document.querySelectorAll<HTMLElement>(MERMAID_SOURCE_SELECTOR)) {
    if (el.closest('section[data-type="mermaid"]') || el.querySelector('svg')) continue;
    if (el.isContentEditable || el.closest('textarea')) continue;
    const pre = el.closest('pre');
    const anchor = pre?.closest<HTMLElement>('div.language-mermaid') ?? pre ?? el;
    claim({ anchor, code: codeText(el) });
  }

  // Diagrams the page rendered itself (docs sites using mermaid.js directly).
  for (const svg of document.querySelectorAll<SVGSVGElement>(MERMAID_SVG_SELECTOR)) {
    if (svg.closest('section[data-type="mermaid"]')) continue;
    claim({ anchor: svg, svg });
  }

  return found;
}

export { HOST_TAG };
