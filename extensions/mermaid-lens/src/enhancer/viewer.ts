import { PALETTE, TIMING, type Settings } from '../shared/settings';
import { BASE_BUILD_SECONDS, BuildAnimation } from './animate';
import * as exporter from './export';
import { extractGraph, type GEdge, type GNode, type Graph } from './graph';
import { Highlighter } from './highlight';
import { icon } from './icons';
import { isDarkBehind, pageBackground, renderMermaid } from './renderer';
import { HOST_TAG, type DiagramSource } from './sources';
import { BASE_CSS } from './styles';

export interface ViewerContext {
  settings(): Settings;
  /** Apply a settings change everywhere; `persist: false` for live previews (colour drag). */
  update(patch: Partial<Settings>, persist?: boolean): void;
  disableSite(): void;
  siteName: string;
}

const PAD = 16;
const MIN_HEIGHT = 140;
const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
const HINT = `Drag to pan · <kbd>${MOD}</kbd> + scroll to zoom · Hover to highlight, click to pin`;
/** Grace period before un-highlighting, so crossing a gap between shapes doesn't flicker. */
const HOVER_OUT_MS = 90;

let baseSheet: CSSStyleSheet | undefined;
function getBaseSheet(): CSSStyleSheet {
  if (!baseSheet) {
    baseSheet = new CSSStyleSheet();
    baseSheet.replaceSync(BASE_CSS);
  }
  return baseSheet;
}

/**
 * Mermaid 12's themes give nodes, clusters and actors a fixed light-grey drop
 * shadow (even on dark backgrounds), via CSS and via `<filter>` elements.
 * Flatten them, and gradient-stroked borders too: the diagram should sit
 * cleanly on the page with solid outlines.
 */
const SHADOW_CSS = /filter\s*:\s*(?:drop-shadow\([^;}]*|url\([^)]*shadow[^)]*\))\s*;?/gi;
function flattenStyles(svg: SVGSVGElement, css: string): string {
  const shadowFilters = [...svg.querySelectorAll('filter')].filter((f) => /shadow/i.test(f.id));
  const ids = new Set(shadowFilters.map((f) => f.id));
  shadowFilters.forEach((f) => f.remove());
  const isShadow = (v: string) => /drop-shadow\(/i.test(v) || [...ids].some((id) => v.includes(`#${id}`));
  for (const el of svg.querySelectorAll<SVGElement>('[filter], [style*="filter"]')) {
    const attr = el.getAttribute('filter');
    if (attr && isShadow(attr)) el.removeAttribute('filter');
    const inline = el.style.getPropertyValue('filter');
    if (inline && isShadow(inline)) el.style.removeProperty('filter');
  }
  css = css.replace(SHADOW_CSS, 'filter: none;');

  // Gradient-stroked borders (diagrams the page rendered itself): use a solid colour instead.
  for (const g of svg.querySelectorAll('linearGradient, radialGradient')) {
    if (!/gradient$/i.test(g.id)) continue;
    const colour = g.querySelector('stop')?.getAttribute('stop-color');
    if (!colour) continue;
    const ref = new RegExp(`url\\(\\s*["']?#${g.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?\\s*\\)`, 'g');
    css = css.replace(ref, colour);
  }
  return css;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const HL_LABEL = { neighbors: 'Connected', flow: 'Full flow', off: 'Off' } as const;

type PopName = 'highlight' | 'timing' | 'copy' | 'more';
type TimingKey = keyof typeof TIMING;
const secs = (v: number) => `${v.toFixed(1)}s`;

export class DiagramViewer {
  readonly host = document.createElement(HOST_TAG);
  mounted = false;

  private root = this.host.attachShadow({ mode: 'open' });
  private diagramSheet = new CSSStyleSheet();
  private frame!: HTMLDivElement;
  private viewport!: HTMLDivElement;
  private zoomLabel!: HTMLElement;
  private hint!: HTMLElement;
  private toastEl!: HTMLElement;

  private svg?: SVGSVGElement;
  private styleText = '';
  private diagramType = '';
  private natural = { x: 0, y: 0, w: 1, h: 1 };
  private view = { x: 0, y: 0, k: 1 };
  private size = { w: 0, h: 0 };
  private lastWidth = 0;
  private pristine = true;
  private fullscreen = false;
  private renderedTheme = '';
  private dark = false;

  private graph?: Graph | null;
  private highlighter?: Highlighter;
  private build?: BuildAnimation;

  private openPop?: PopName;
  private pointers = new Map<number, { x: number; y: number }>();
  private drag?: { sx: number; sy: number; x0: number; y0: number; moved: boolean; target: EventTarget | null };
  private pinch?: { d0: number; k0: number; cx: number; cy: number; x0: number; y0: number };
  private hintTimer = 0;
  private toastTimer = 0;
  private hoverTimer = 0;
  private hintShownAt = 0;
  private ro?: ResizeObserver;
  private prevDisplay: [string, string] = ['', ''];
  private cleanups: (() => void)[] = [];

  constructor(
    readonly source: DiagramSource,
    private ctx: ViewerContext,
  ) {}

  // ------------------------------------------------------------------ lifecycle

  async mount(): Promise<boolean> {
    this.dark = isDarkBehind(this.source.anchor);
    let markup: string;
    try {
      markup = await this.produceSvg();
    } catch (err) {
      console.debug('[Mermaid Lens] could not render diagram', err);
      return false;
    }
    const anchor = this.source.anchor;
    if (!anchor.isConnected) return false;

    this.buildUi();
    this.setSvg(markup);
    this.applySettings(this.ctx.settings());

    const cs = getComputedStyle(anchor);
    this.host.style.margin = cs.margin;
    if (cs.display === 'none') this.host.style.display = 'none';
    anchor.before(this.host);
    this.prevDisplay = [anchor.style.getPropertyValue('display'), anchor.style.getPropertyPriority('display')];
    anchor.style.setProperty('display', 'none', 'important');

    this.ro = new ResizeObserver(() => this.onResize());
    this.ro.observe(this.frame);
    this.mounted = true;
    return true;
  }

  destroy() {
    this.ro?.disconnect();
    this.build?.stop();
    this.cleanups.forEach((c) => c());
    this.cleanups = [];
    if (document.fullscreenElement === this.host) void document.exitFullscreen().catch(() => {});
    this.host.remove();
    const [value, priority] = this.prevDisplay;
    if (this.mounted) {
      if (value) this.source.anchor.style.setProperty('display', value, priority);
      else this.source.anchor.style.removeProperty('display');
    }
    this.mounted = false;
  }

  private themeName(s: Settings): string {
    if (s.theme !== 'auto') return s.theme;
    return this.dark ? 'dark' : 'default';
  }

  private async produceSvg(): Promise<string> {
    const { code, svg } = this.source;
    this.renderedTheme = this.themeName(this.ctx.settings());
    if (code !== undefined) {
      const out = await renderMermaid(code, this.renderedTheme);
      this.diagramType = out.diagramType;
      return out.svg;
    }
    this.diagramType = svg?.getAttribute('aria-roledescription') ?? '';
    return svg!.outerHTML;
  }

  /** Re-render if the effective theme changed (page switched dark/light, or setting changed). */
  async refreshTheme() {
    if (!this.mounted) return;
    this.dark = isDarkBehind(this.source.anchor);
    this.host.dataset.ui = this.dark ? 'dark' : 'light';
    this.host.style.setProperty('--ml-page-bg', pageBackground(this.host.parentElement ?? document.body));
    if (this.source.code === undefined || this.themeName(this.ctx.settings()) === this.renderedTheme) return;
    try {
      const markup = await this.produceSvg();
      if (!this.mounted) return;
      this.setSvg(markup);
      this.applySettings(this.ctx.settings());
      this.size = { w: 0, h: 0 };
      this.lastWidth = 0;
      this.onResize();
    } catch {
      /* keep the previous rendering */
    }
  }

  // ------------------------------------------------------------------ DOM

  private buildUi() {
    const site = esc(this.ctx.siteName);
    const canCode = this.source.code !== undefined;
    const item = (act: string, ic: Parameters<typeof icon>[0], label: string, sub = '', extra = '') =>
      `<button class="item" data-act="${act}" ${extra}>${icon(ic)}<span class="label">${label}${sub ? `<span class="sub">${sub}</span>` : ''}</span></button>`;
    const slider = (key: TimingKey, label: string, lo: string, hi: string) => {
      const { min, max, step } = TIMING[key];
      return `<div class="timing"><div class="head"><h4>${label}</h4><output data-out="${key}"></output></div>
        <input type="range" data-timing="${key}" min="${min}" max="${max}" step="${step}" aria-label="${label} duration">
        <div class="scale"><span>${lo}</span><span>${hi}</span></div></div>`;
    };
    const seg = (group: string, opts: [string, string][]) =>
      `<div class="seg" role="radiogroup" data-group="${group}">${opts
        .map(([v, l]) => `<button role="radio" data-act="set-${group}" data-val="${v}">${l}</button>`)
        .join('')}</div>`;

    this.root.adoptedStyleSheets = [getBaseSheet(), this.diagramSheet];
    this.root.innerHTML = `
      <div class="frame" tabindex="0" aria-label="Mermaid diagram viewer">
        <div class="viewport"></div>

        <div class="ui bar toolbar" role="toolbar" aria-label="Diagram tools">
          <button class="btn" data-act="cycle-highlight" data-state="neighbors" data-tip="Highlight: Connected (H)" aria-label="Highlight: Connected">${icon('highlight')}<span class="dot"></span></button>
          <button class="btn" data-act="toggle-flow" data-tip="Flowing edges" aria-pressed="false">${icon('waves')}</button>
          <button class="btn" data-act="replay" data-tip="Replay build-up">${icon('replay')}</button>
          <button class="btn" data-act="pop-copy" data-tip="Copy &amp; export" aria-expanded="false">${icon('copy')}</button>
          <span class="sep"></span>
          <button class="btn" data-act="fullscreen" data-tip="Full screen (F)">${icon('expand')}</button>
          <button class="btn" data-act="pop-more" data-tip="More" aria-expanded="false">${icon('more')}</button>
        </div>

        <div class="ui bar zoombar">
          <button class="btn sm" data-act="zoom-out" data-tip="Zoom out (−)">${icon('minus')}</button>
          <button class="zoom-label" data-act="fit" data-tip="Fit to view (0)">100%</button>
          <button class="btn sm" data-act="zoom-in" data-tip="Zoom in (+)">${icon('plus')}</button>
          <span class="sep"></span>
          <button class="btn sm" data-act="fit" data-tip="Fit to view (0)">${icon('fit')}</button>
        </div>

        <div class="hint"></div>

        <div class="pop" data-pop="highlight" role="dialog" aria-label="Highlight options">
          <h4>Highlight</h4>
          ${seg('highlightMode', [['neighbors', 'Connected'], ['flow', 'Full flow']])}
          <div class="row">
            <h4>Direction</h4>
            ${seg('direction', [['both', 'Both'], ['down', 'Downstream'], ['up', 'Upstream']])}
          </div>
          <div class="row">
            <h4>Colour</h4>
            <div class="swatches">
              ${PALETTE.map((c) => `<button class="swatch" role="radio" data-act="color" data-color="${c}" aria-label="Colour ${c}"></button>`).join('')}
              <label class="custom" data-tip="Custom colour"><input type="color" aria-label="Custom colour"></label>
            </div>
          </div>
          <p class="note">Hover a node or arrow to light up what it connects to. Click to pin it, <kbd>Shift</kbd>-click to pin more, <kbd>Esc</kbd> or click empty space to unpin.</p>
        </div>

        <div class="pop" data-pop="timing" role="dialog" aria-label="Animation timing">
          ${slider('flowDuration', 'Flowing edges', 'Fast', 'Slow')}
          ${slider('buildDuration', 'Build-up replay', 'Quick', 'Leisurely')}
          <p class="note">Flowing edges: time for one dash cycle. Build-up: roughly how long the whole diagram takes to draw.</p>
        </div>

        <div class="pop menu" data-pop="copy" role="menu">
          ${item('copy-code', 'code', 'Copy Mermaid code', canCode ? '' : 'Source not available on this page', canCode ? '' : 'disabled')}
          ${item('copy-png', 'image', 'Copy as image', 'PNG, ready to paste')}
          ${item('copy-svg', 'vector', 'Copy SVG markup')}
          <div class="divider"></div>
          ${item('download-png', 'download', 'Download PNG')}
          ${item('download-svg', 'download', 'Download SVG')}
        </div>

        <div class="pop menu" data-pop="more" role="menu">
          ${item('pop-highlight', 'highlight', 'Highlight options', 'Mode, direction and colour')}
          ${item('pop-timing', 'clock', 'Animation timing', 'Flowing edges and build-up speed')}
          ${item('open-live', 'external', 'Open in Mermaid Live Editor', '', canCode ? '' : 'disabled')}
          ${item('fit', 'reset', 'Reset view')}
          <div class="divider"></div>
          <button class="item" role="switch" data-act="disable-site" aria-checked="true">${icon('power')}<span class="label">Enabled on ${site}<span class="sub">Turn back on from the toolbar icon</span></span><span class="switch"></span></button>
        </div>

        <div class="toast" role="status" aria-live="polite"></div>
      </div>`;

    const $ = <T extends Element>(sel: string) => this.root.querySelector(sel) as T;
    this.frame = $('.frame');
    this.viewport = $('.viewport');
    this.zoomLabel = $('.zoom-label');
    this.hint = $('.hint');
    this.toastEl = $('.toast');
    this.hint.innerHTML = HINT;
    this.root.querySelectorAll<HTMLElement>('.swatch').forEach((s) => s.style.setProperty('--c', s.dataset.color!));

    this.host.dataset.ui = this.dark ? 'dark' : 'light';
    this.host.style.setProperty('--ml-page-bg', pageBackground(this.source.anchor.parentElement ?? document.body));

    this.frame.addEventListener('click', (e) => this.onClick(e));
    this.frame.addEventListener('keydown', (e) => this.onKey(e));
    this.frame.addEventListener('pointerenter', () => this.onEnter());
    this.viewport.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.viewport.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.viewport.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.viewport.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    this.viewport.addEventListener('pointerover', (e) => this.onHover(e));
    this.viewport.addEventListener('pointerleave', () => this.setHover(null));
    this.viewport.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.viewport.addEventListener('dblclick', (e) => {
      if ((e.target as Element).closest('g.node, .ml-hit, g.edgeLabel')) return;
      const p = this.local(e);
      this.zoomAt(e.shiftKey ? 0.5 : 2, p.x, p.y, true);
    });

    const colorInput = $<HTMLInputElement>('.custom input');
    colorInput.addEventListener('input', () => this.ctx.update({ highlightColor: colorInput.value }, false));
    colorInput.addEventListener('change', () => this.ctx.update({ highlightColor: colorInput.value }));

    this.root.querySelectorAll<HTMLInputElement>('input[data-timing]').forEach((r) => {
      const patch = () => ({ [r.dataset.timing as TimingKey]: Number(r.value) });
      r.addEventListener('input', () => this.ctx.update(patch(), false)); // live preview while dragging
      r.addEventListener('change', () => this.ctx.update(patch()));
    });

    const onFs = () => {
      const fs = document.fullscreenElement === this.host;
      if (fs === this.fullscreen) return;
      this.fullscreen = fs;
      const btn = $<HTMLElement>('[data-act="fullscreen"]');
      btn.innerHTML = icon(fs ? 'collapse' : 'expand');
      btn.dataset.tip = fs ? 'Exit full screen (F)' : 'Full screen (F)';
      this.pristine = true;
      if (fs) this.frame.focus({ preventScroll: true });
    };
    document.addEventListener('fullscreenchange', onFs);
    this.cleanups.push(() => document.removeEventListener('fullscreenchange', onFs));
  }

  private setSvg(markup: string) {
    const tpl = document.createElement('template');
    tpl.innerHTML = markup;
    const svg = tpl.content.querySelector('svg');
    if (!svg) throw new Error('Mermaid returned no SVG');

    // Mermaid ships its styles in an inline <style>. Move them to a constructable
    // stylesheet so they survive strict CSPs (selectors are scoped by the svg id).
    const styles = [...svg.querySelectorAll('style')];
    styles.forEach((s) => s.remove());
    this.styleText = flattenStyles(svg, styles.map((s) => s.textContent ?? '').join('\n'));
    try {
      this.diagramSheet.replaceSync(this.styleText.replace(/@import[^;]+;/g, ''));
    } catch {
      /* malformed CSS from a page-rendered diagram: ignore */
    }

    const vb = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) {
      this.natural = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
    } else {
      const w = parseFloat(svg.getAttribute('width') ?? '') || 600;
      const h = parseFloat(svg.getAttribute('height') ?? '') || 400;
      this.natural = { x: 0, y: 0, w, h };
    }
    svg.removeAttribute('style');
    svg.removeAttribute('height');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.classList.add('ml-svg');

    this.build?.stop();
    this.viewport.replaceChildren(svg);
    this.svg = svg;
    this.graph = undefined;
    this.highlighter = undefined;
    this.build = new BuildAnimation(svg);
  }

  // ------------------------------------------------------------------ settings

  applySettings(s: Settings, prev?: Settings) {
    if (!this.frame) return;
    this.host.style.setProperty('--ml-hl', s.highlightColor);

    const q = (sel: string) => this.root.querySelectorAll<HTMLElement>(sel);
    q('[data-group="highlightMode"] button').forEach((b) =>
      b.setAttribute('aria-checked', String(b.dataset.val === s.highlightMode)),
    );
    q('[data-group="direction"] button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.val === s.direction)));
    let matched = false;
    q('.swatch').forEach((b) => {
      const on = b.dataset.color!.toLowerCase() === s.highlightColor.toLowerCase();
      matched ||= on;
      b.setAttribute('aria-checked', String(on));
    });
    const custom = this.root.querySelector<HTMLElement>('.custom')!;
    custom.setAttribute('aria-checked', String(!matched));
    const input = custom.querySelector('input')!;
    if (/^#[0-9a-f]{6}$/i.test(s.highlightColor)) input.value = s.highlightColor;

    q('[data-act="cycle-highlight"]').forEach((b) => {
      const state = s.highlight ? s.highlightMode : 'off';
      if (b.dataset.state !== state) {
        b.dataset.state = state;
        b.innerHTML = `${icon(state === 'flow' ? 'flow' : 'highlight')}<span class="dot"></span>`;
      }
      b.classList.toggle('on', s.highlight);
      b.dataset.tip = `Highlight: ${HL_LABEL[state]} (H)`;
      b.setAttribute('aria-label', `Highlight: ${HL_LABEL[state]}`);
    });
    q('[data-act="toggle-flow"]').forEach((b) => {
      b.classList.toggle('on', s.flowAnimation);
      b.setAttribute('aria-pressed', String(s.flowAnimation));
      b.dataset.tip = s.flowAnimation ? 'Flowing edges: on' : 'Flowing edges: off';
    });
    this.host.style.setProperty('--ml-flow-duration', `${s.flowDuration}s`);
    for (const key of Object.keys(TIMING) as TimingKey[]) {
      q(`input[data-timing="${key}"]`).forEach((r) => ((r as HTMLInputElement).value = String(s[key])));
      q(`output[data-out="${key}"]`).forEach((o) => (o.textContent = secs(s[key])));
    }

    this.svg?.classList.toggle('ml-flowing', s.flowAnimation);
    this.svg?.classList.toggle('ml-hl-enabled', s.highlight);
    this.highlighter?.configure(s.highlight, s.highlightMode, s.direction);

    if (prev && prev.theme !== s.theme) void this.refreshTheme();
  }

  // ------------------------------------------------------------------ geometry

  private onResize() {
    const w = this.viewport.clientWidth;
    if (!w) return;
    if (!this.fullscreen && w !== this.lastWidth) {
      this.lastWidth = w;
      const h = this.inlineHeight(w);
      if (Math.abs(h - this.frame.offsetHeight) > 1) {
        this.frame.style.height = `${h}px`;
        return; // the observer fires again with the new height
      }
    }
    const prev = this.size;
    this.size = { w, h: this.viewport.clientHeight };
    if (this.pristine || !prev.w) {
      this.fit();
    } else {
      // Keep whatever was in the middle of the view in the middle.
      const { k } = this.view;
      const cx = (prev.w / 2 - this.view.x) / k;
      const cy = (prev.h / 2 - this.view.y) / k;
      this.view.x = this.size.w / 2 - cx * k;
      this.view.y = this.size.h / 2 - cy * k;
      this.applyView();
    }
    if (this.graph === undefined) this.ensureGraph();
  }

  private inlineHeight(width: number): number {
    const scale = Math.min(1, (width - PAD * 2) / this.natural.w);
    const maxH = Math.max(320, Math.min(window.innerHeight * 0.8, 900));
    return Math.round(clamp(this.natural.h * scale + PAD * 2, MIN_HEIGHT, maxH));
  }

  private get fitScale(): number {
    const { w, h } = this.size;
    return Math.min((w - PAD * 2) / this.natural.w, (h - PAD * 2) / this.natural.h, this.fullscreen ? 2.5 : 1);
  }

  fit() {
    if (!this.size.w) return;
    const k = Math.max(0.02, this.fitScale);
    const { w, h } = this.size;
    this.view = {
      k,
      x: (w - this.natural.w * k) / 2 - this.natural.x * k,
      y: (h - this.natural.h * k) / 2 - this.natural.y * k,
    };
    this.pristine = true;
    this.applyView();
  }

  private applyView() {
    if (!this.svg) return;
    const { x, y, k } = this.view;
    const { w, h } = this.size;
    this.svg.setAttribute('viewBox', `${-x / k} ${-y / k} ${w / k} ${h / k}`);
    this.zoomLabel.textContent = `${Math.round(k * 100)}%`;
  }

  private zoomAt(factor: number, px: number, py: number, animate = false) {
    const k0 = this.view.k;
    const k = clamp(k0 * factor, Math.min(0.05, this.fitScale * 0.5), 12);
    const f = k / k0;
    const target = { k, x: px - (px - this.view.x) * f, y: py - (py - this.view.y) * f };
    this.pristine = false;
    if (animate) this.animateTo(target);
    else {
      this.view = target;
      this.applyView();
    }
  }

  private zoomBy(factor: number) {
    this.zoomAt(factor, this.size.w / 2, this.size.h / 2, true);
  }

  private animateTo(target: { x: number; y: number; k: number }) {
    const from = { ...this.view };
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 180);
      const e = 1 - Math.pow(1 - p, 3);
      this.view = {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        k: from.k + (target.k - from.k) * e,
      };
      this.applyView();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private local(e: { clientX: number; clientY: number }) {
    const r = this.viewport.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // ------------------------------------------------------------------ input

  private onEnter() {
    this.ensureGraph();
    if (performance.now() - this.hintShownAt > 60_000) this.flashHint(null, 4000);
  }

  private flashHint(html: string | null, ms = 1800) {
    this.hint.innerHTML = html ?? HINT;
    this.hintShownAt = performance.now();
    this.hint.classList.add('show');
    clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => this.hint.classList.remove('show'), ms);
  }

  private onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.closePop();
    this.frame.dataset.pointer = '';
    this.frame.focus({ preventScroll: true });
    this.viewport.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.drag = { sx: e.clientX, sy: e.clientY, x0: this.view.x, y0: this.view.y, moved: false, target: e.target };
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const mid = this.local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      this.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), k0: this.view.k, cx: mid.x, cy: mid.y, x0: this.view.x, y0: this.view.y };
      if (this.drag) this.drag.moved = true;
    }
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const k = clamp((this.pinch.k0 * d) / this.pinch.d0, 0.05, 12);
      const f = k / this.pinch.k0;
      const mid = this.local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      this.view = {
        k,
        x: mid.x - (this.pinch.cx - this.pinch.x0) * f,
        y: mid.y - (this.pinch.cy - this.pinch.y0) * f,
      };
      this.pristine = false;
      this.applyView();
      return;
    }
    const d = this.drag;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 4) {
      d.moved = true;
      this.viewport.classList.add('grabbing');
    }
    if (d.moved) {
      this.view.x = d.x0 + dx;
      this.view.y = d.y0 + dy;
      this.pristine = false;
      this.applyView();
    }
  }

  private onPointerUp(e: PointerEvent) {
    if (!this.pointers.delete(e.pointerId)) return;
    if (this.pointers.size === 0) {
      if (this.drag && !this.drag.moved && e.type === 'pointerup') this.onTap(this.drag.target, e);
      this.drag = undefined;
      this.pinch = undefined;
      this.viewport.classList.remove('grabbing');
    } else if (this.pointers.size === 1) {
      const [p] = [...this.pointers.values()];
      this.pinch = undefined;
      this.drag = { sx: p.x, sy: p.y, x0: this.view.x, y0: this.view.y, moved: true, target: null };
    }
  }

  private onWheel(e: WheelEvent) {
    const zoomGesture = e.ctrlKey || e.metaKey;
    if (!zoomGesture && !this.fullscreen) {
      if (performance.now() - this.hintShownAt > 2500) this.flashHint(`Hold <kbd>${MOD}</kbd> and scroll to zoom`);
      return; // let the page scroll
    }
    e.preventDefault();
    const p = this.local(e);
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const dy = e.deltaY * unit;
    const mouseWheel = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 40 && Number.isInteger(e.deltaY));
    if (zoomGesture || mouseWheel) {
      // Trackpad pinches arrive as small ctrl+wheel deltas; mouse wheels as big steps.
      const rate = zoomGesture && Math.abs(dy) < 50 ? 0.01 : 0.002;
      this.zoomAt(Math.exp(-dy * rate), p.x, p.y);
    } else {
      this.view.x -= e.deltaX * unit;
      this.view.y -= dy;
      this.pristine = false;
      this.applyView();
    }
  }

  private onKey(e: KeyboardEvent) {
    delete this.frame.dataset.pointer;
    if (e.target instanceof HTMLInputElement || e.altKey || e.ctrlKey || e.metaKey) return;
    const pan = (dx: number, dy: number) => {
      this.view.x += dx;
      this.view.y += dy;
      this.pristine = false;
      this.applyView();
    };
    switch (e.key) {
      case '+':
      case '=':
        this.zoomBy(1.25);
        break;
      case '-':
      case '_':
        this.zoomBy(0.8);
        break;
      case '0':
        this.fit();
        break;
      case 'f':
      case 'F':
        void this.toggleFullscreen();
        break;
      case 'h':
      case 'H':
        this.cycleHighlight();
        break;
      case 'Escape':
        if (this.openPop) this.closePop();
        else if (this.highlighter?.active) this.highlighter.clear();
        else return; // let the browser exit full screen
        break;
      case 'ArrowLeft':
        pan(60, 0);
        break;
      case 'ArrowRight':
        pan(-60, 0);
        break;
      case 'ArrowUp':
        pan(0, 60);
        break;
      case 'ArrowDown':
        pan(0, -60);
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  }

  // ------------------------------------------------------------------ highlight

  private ensureGraph(): Graph | null {
    if (this.graph !== undefined || !this.svg) return this.graph ?? null;
    if (!this.viewport.clientWidth) return null; // not laid out yet (e.g. collapsed <details>)
    this.graph = extractGraph(this.svg);
    if (this.graph) {
      const s = this.ctx.settings();
      this.highlighter = new Highlighter(this.svg, this.graph, s.highlight, s.highlightMode, s.direction);
    }
    return this.graph;
  }

  private onHover(e: PointerEvent) {
    // Touch has no hover (a tap pins instead); ignore pointers mid-drag or mid-pinch.
    if (e.pointerType === 'touch' || this.pointers.size || !this.ctx.settings().highlight) return;
    const graph = this.ensureGraph();
    if (!graph || !(e.target instanceof Element)) return;
    this.setHover(this.hitTest(e.target, graph));
  }

  private setHover(item: GNode | GEdge | null) {
    clearTimeout(this.hoverTimer);
    if (item) this.highlighter?.hover(item);
    else this.hoverTimer = window.setTimeout(() => this.highlighter?.hover(null), HOVER_OUT_MS);
  }

  /** Toolbar button / H: Connected → Full flow → Off → Connected. */
  private cycleHighlight() {
    const s = this.ctx.settings();
    const patch: Partial<Settings> = !s.highlight
      ? { highlight: true, highlightMode: 'neighbors' }
      : s.highlightMode === 'neighbors'
        ? { highlightMode: 'flow' }
        : { highlight: false };
    this.ctx.update(patch);
    const next = { ...s, ...patch };
    this.toast(`Highlight: ${HL_LABEL[next.highlight ? next.highlightMode : 'off']}`);
  }

  private onTap(target: EventTarget | null, e: PointerEvent) {
    const s = this.ctx.settings();
    if (!s.highlight || !(target instanceof Element)) return;
    const graph = this.ensureGraph();
    if (!graph || !this.highlighter) return;
    const item = this.hitTest(target, graph);
    if (item) this.highlighter.select(item, e.shiftKey || e.metaKey || e.ctrlKey);
    else this.highlighter.clear();
  }

  private hitTest(target: Element, graph: Graph): GNode | GEdge | null {
    const el = target.closest('.ml-hit, g.node, g.edgeLabel, .cluster-label');
    if (!el) return null;
    if (el.matches('.cluster-label')) {
      const cluster = el.closest('g.cluster');
      return (cluster && graph.byElement.get(cluster)) || null;
    }
    return graph.byElement.get(el) ?? null;
  }

  // ------------------------------------------------------------------ toolbar actions

  private onClick(e: MouseEvent) {
    const btn = (e.target as Element).closest<HTMLElement>('[data-act]');
    if (!btn || btn.hasAttribute('disabled')) return;
    const act = btn.dataset.act!;
    if (act.startsWith('pop-')) {
      const name = act.slice(4) as PopName;
      // Popovers opened from a menu item hang off the toolbar button that opened the menu.
      const anchor = btn.closest('.pop') ? this.root.querySelector<HTMLElement>(`[data-act="pop-${this.openPop}"]`)! : btn;
      if (this.openPop === name) this.closePop();
      else this.showPop(name, anchor);
      return;
    }
    const s = this.ctx.settings();
    switch (act) {
      case 'cycle-highlight':
        this.cycleHighlight();
        break;
      case 'set-highlightMode':
        this.ctx.update({ highlightMode: btn.dataset.val as Settings['highlightMode'] });
        break;
      case 'set-direction':
        this.ctx.update({ direction: btn.dataset.val as Settings['direction'] });
        break;
      case 'color':
        this.ctx.update({ highlightColor: btn.dataset.color! });
        break;
      case 'toggle-flow':
        this.ctx.update({ flowAnimation: !s.flowAnimation });
        break;
      case 'replay':
        this.closePop();
        this.replay();
        break;
      case 'zoom-in':
        this.zoomBy(1.25);
        break;
      case 'zoom-out':
        this.zoomBy(0.8);
        break;
      case 'fit':
        this.closePop();
        this.fit();
        break;
      case 'fullscreen':
        void this.toggleFullscreen();
        break;
      case 'copy-code':
        this.closePop();
        exporter.copyText(this.source.code ?? '').then(
          () => this.toast('Mermaid code copied'),
          () => this.toast('Couldn’t access the clipboard'),
        );
        break;
      case 'copy-svg':
        this.closePop();
        exporter.copyText(exporter.serializeSvg(this.exportSource())).then(
          () => this.toast('SVG copied'),
          () => this.toast('Couldn’t access the clipboard'),
        );
        break;
      case 'copy-png':
        this.closePop();
        // ClipboardItem must be created inside the click; it accepts the PNG as a promise.
        exporter.copyPng(exporter.svgToPng(this.exportSource())).then(
          () => this.toast('Image copied'),
          (err) => {
            console.debug('[Mermaid Lens] image copy failed', err);
            this.toast('Couldn’t copy the image');
          },
        );
        break;
      case 'download-png':
        this.closePop();
        exporter.svgToPng(this.exportSource()).then(
          (png) => exporter.download(`${this.fileName()}.png`, png),
          () => this.toast('Couldn’t create the image'),
        );
        break;
      case 'download-svg':
        this.closePop();
        exporter.download(`${this.fileName()}.svg`, exporter.serializeSvg(this.exportSource()));
        break;
      case 'open-live':
        this.closePop();
        window.open(exporter.mermaidLiveUrl(this.source.code ?? '', this.renderedTheme), '_blank', 'noopener');
        break;
      case 'disable-site':
        this.ctx.disableSite();
        break;
    }
  }

  private replay() {
    const svg = this.svg;
    if (!svg || !this.build) return;
    const flowing = svg.classList.contains('ml-flowing');
    svg.classList.remove('ml-flowing'); // its !important dash styles would fight the draw-in
    const s = this.ctx.settings();
    this.build.play(
      this.ensureGraph(),
      () => svg.classList.toggle('ml-flowing', this.ctx.settings().flowAnimation),
      s.buildDuration / BASE_BUILD_SECONDS,
    );
    if (flowing) this.toast('Replaying…');
  }

  private exportSource(): exporter.ExportSource {
    return {
      svg: this.svg!,
      styleText: this.styleText,
      natural: this.natural,
      background: pageBackground(this.host.parentElement ?? document.body),
    };
  }

  private fileName(): string {
    const type = (this.diagramType || 'diagram').replace(/[^a-z0-9]+/gi, '-').replace(/-v\d+$/, '');
    return `mermaid-${type}`;
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement === this.host) await document.exitFullscreen();
      else await this.host.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      this.toast('Full screen isn’t available here');
    }
  }

  private showPop(name: PopName, btn: HTMLElement) {
    this.closePop();
    const pop = this.root.querySelector<HTMLElement>(`[data-pop="${name}"]`)!;
    const fr = this.frame.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    pop.style.right = `${Math.max(10, fr.right - br.right - 6)}px`;
    pop.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    this.frame.classList.add('engaged');
    this.openPop = name;
    this.popAnchor = btn;

    const outside = (ev: Event) => {
      if (!ev.composedPath().some((n) => n === pop || n === btn)) this.closePop();
    };
    // Defer so the click that opened the popover doesn't immediately close it.
    setTimeout(() => document.addEventListener('pointerdown', outside, true));
    this.popCleanup = () => document.removeEventListener('pointerdown', outside, true);
  }

  private popCleanup?: () => void;
  private popAnchor?: HTMLElement;

  private closePop() {
    if (!this.openPop) return;
    this.root.querySelector(`[data-pop="${this.openPop}"]`)?.classList.remove('open');
    this.popAnchor?.setAttribute('aria-expanded', 'false');
    this.popAnchor = undefined;
    this.frame.classList.remove('engaged');
    this.popCleanup?.();
    this.popCleanup = undefined;
    this.openPop = undefined;
  }

  private toast(message: string) {
    this.toastEl.innerHTML = `${icon('check')}<span></span>`;
    this.toastEl.querySelector('span')!.textContent = message;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 1800);
  }
}
