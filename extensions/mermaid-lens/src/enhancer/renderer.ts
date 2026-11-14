/** Serialised access to the bundled Mermaid (it is not safe to render concurrently). */
import DOMPurify from 'dompurify';

declare const mermaid: typeof import('mermaid').default;

let chain: Promise<unknown> = Promise.resolve();
let counter = 0;

export interface Rendered {
  svg: string;
  diagramType: string;
}

async function renderOnce(code: string, theme: string, securityLevel: 'sandbox' | 'strict'): Promise<Rendered> {
  const id = `mlens-${Date.now().toString(36)}-${counter++}`;
  mermaid.initialize({ startOnLoad: false, securityLevel, suppressErrorRendering: true, theme: theme as never });
  try {
    const { svg, diagramType } = await mermaid.render(id, code);
    return { svg, diagramType };
  } finally {
    // Mermaid normally cleans up, but not always after an error.
    for (const prefix of ['d', 'i', '']) document.getElementById(prefix + id)?.closest('body > *')?.remove();
  }
}

export function renderMermaid(code: string, theme: string): Promise<Rendered> {
  const job = chain.then(async () => {
    // 'sandbox' makes Mermaid lay out text inside a blank iframe, so the host
    // page's CSS (e.g. GitHub's `.label { font-size: 12px }`) can't skew label
    // measurements. We unwrap the SVG and sanitise it exactly as 'strict' would.
    // A few diagram types (gitGraph in Mermaid 12) can't render sandboxed, so
    // fall back to 'strict' for those.
    try {
      const out = await renderOnce(code, theme, 'sandbox');
      return { svg: unwrapSandbox(out.svg), diagramType: out.diagramType };
    } catch {
      return renderOnce(code, theme, 'strict');
    }
  });
  chain = job.catch(() => {});
  return job;
}

function unwrapSandbox(markup: string): string {
  const b64 = markup.match(/src="data:text\/html;[^,"]*base64,([^"]+)"/)?.[1];
  let html = markup;
  if (b64) {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    html = new TextDecoder().decode(bytes);
  }
  const svg = html.match(/<svg[\s\S]*<\/svg>/)?.[0];
  if (!svg) throw new Error('Mermaid returned no SVG');
  // Same sanitisation Mermaid applies in 'strict' mode.
  return DOMPurify.sanitize(svg, {
    ADD_TAGS: ['foreignobject'],
    ADD_ATTR: ['dominant-baseline'],
    HTML_INTEGRATION_POINTS: { foreignobject: true },
  } as never) as unknown as string;
}

/** Is the page behind `el` dark? Uses GitHub's colour-mode hints, then luminance. */
export function isDarkBehind(el: Element): boolean {
  const html = document.documentElement;
  const mode = html.getAttribute('data-color-mode');
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (mode === 'auto') return matchMedia('(prefers-color-scheme: dark)').matches;
  return luminance(pageBackground(el)) < 0.4;
}

/** First non-transparent background colour behind an element. */
export function pageBackground(el: Element): string {
  for (let cur: Element | null = el; cur; cur = cur.parentElement) {
    const bg = getComputedStyle(cur).backgroundColor;
    if (bg && !/rgba\(.*,\s*0\)$|transparent/.test(bg)) return bg;
  }
  const bodyBg = document.body ? getComputedStyle(document.body).backgroundColor : '';
  if (bodyBg && !/rgba\(.*,\s*0\)$|transparent/.test(bodyBg)) return bodyBg;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'rgb(13, 17, 23)' : 'rgb(255, 255, 255)';
}

function luminance(color: string): number {
  const m = color.match(/[\d.]+/g);
  if (!m) return 1;
  const [r, g, b] = m.map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
