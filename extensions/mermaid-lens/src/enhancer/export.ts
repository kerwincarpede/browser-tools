/** Clipboard, download and image-export helpers. */

export interface ExportSource {
  svg: SVGSVGElement;
  /** Mermaid's own <style> text, which we keep in a shadow-root stylesheet at runtime. */
  styleText: string;
  natural: { x: number; y: number; w: number; h: number };
  background: string;
}

/** Standalone SVG markup of the diagram as Mermaid drew it (no highlight/zoom state). */
export function serializeSvg({ svg, styleText, natural }: ExportSource): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('.ml-hit, marker[id$="--ml-hl"]').forEach((n) => n.remove());
  clone.querySelectorAll('[data-ml-marker-start], [data-ml-marker-end], [data-ml-marker-mid]').forEach((el) => {
    for (const a of ['marker-start', 'marker-end', 'marker-mid']) {
      const v = el.getAttribute(`data-ml-${a}`);
      if (v !== null) {
        el.setAttribute(a, v);
        el.removeAttribute(`data-ml-${a}`);
      }
    }
  });
  const strip = (el: Element) => {
    const cls = el.getAttribute('class');
    if (cls && /\bml-/.test(cls)) {
      const next = cls.split(/\s+/).filter((c) => !c.startsWith('ml-')).join(' ');
      if (next) el.setAttribute('class', next);
      else el.removeAttribute('class');
    }
  };
  strip(clone);
  clone.querySelectorAll('[class]').forEach(strip);
  clone.querySelectorAll('[style]').forEach((el) => {
    // Remove animation leftovers but keep Mermaid's own inline styles.
    const s = (el as SVGElement).style;
    s.removeProperty('opacity');
    s.removeProperty('stroke-dasharray');
    s.removeProperty('stroke-dashoffset');
  });

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('viewBox', `${natural.x} ${natural.y} ${natural.w} ${natural.h}`);
  clone.setAttribute('width', String(Math.ceil(natural.w)));
  clone.setAttribute('height', String(Math.ceil(natural.h)));
  clone.removeAttribute('style');
  clone.removeAttribute('preserveAspectRatio');
  if (styleText) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = styleText;
    clone.prepend(style);
  }
  return new XMLSerializer().serializeToString(clone);
}

export async function svgToPng(src: ExportSource, scale = 2): Promise<Blob> {
  const markup = serializeSvg(src);
  const img = new Image();
  img.decoding = 'async';
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  await img.decode();

  const w = Math.ceil(src.natural.w * scale);
  const h = Math.ceil(src.natural.h * scale);
  const pad = 16 * scale;
  const canvas = document.createElement('canvas');
  canvas.width = w + pad * 2;
  canvas.height = h + pad * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = src.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, pad, pad, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'),
  );
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for pages where the async clipboard is unavailable.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) throw new Error('Clipboard unavailable');
  }
}

/** Must be called synchronously from a user gesture; the PNG is produced lazily. */
export function copyPng(png: Promise<Blob>): Promise<void> {
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}

export function download(filename: string, data: Blob | string, type = 'image/svg+xml') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Link that opens the diagram in the official Mermaid Live Editor. */
export function mermaidLiveUrl(code: string, theme: string): string {
  const state = JSON.stringify({ code, mermaid: JSON.stringify({ theme }), autoSync: true, updateDiagram: true });
  const bytes = new TextEncoder().encode(state);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return 'https://mermaid.live/edit#base64:' + btoa(bin);
}
