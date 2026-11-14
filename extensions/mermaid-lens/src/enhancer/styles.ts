/**
 * Styles for the viewer's shadow root. Loaded through a constructable
 * stylesheet so strict page CSPs can't block them.
 */
export const BASE_CSS = /* css */ `
:host {
  all: initial;
  display: block;
  position: relative;
  --ml-hl: #f59e0b;
  --ml-accent: #6366f1;
  --ml-text: #1f2328;
  --ml-muted: #59636e;
  --ml-surface: rgba(255, 255, 255, 0.82);
  --ml-surface-solid: #ffffff;
  --ml-border: rgba(31, 35, 40, 0.12);
  --ml-border-strong: rgba(31, 35, 40, 0.24);
  --ml-hover: rgba(31, 35, 40, 0.06);
  --ml-active-bg: rgba(99, 102, 241, 0.12);
  --ml-tip-bg: #1f2328;
  --ml-tip-fg: #ffffff;
  --ml-shadow: 0 1px 2px rgba(31, 35, 40, 0.06), 0 6px 20px rgba(31, 35, 40, 0.10);
  --ml-shadow-lg: 0 2px 6px rgba(31, 35, 40, 0.08), 0 16px 40px rgba(31, 35, 40, 0.16);
  --ml-page-bg: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Noto Sans", Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: var(--ml-text);
}
:host([data-ui="dark"]) {
  --ml-accent: #8b93ff;
  --ml-text: #e6edf3;
  --ml-muted: #9198a1;
  --ml-surface: rgba(22, 27, 34, 0.82);
  --ml-surface-solid: #161b22;
  --ml-border: rgba(240, 246, 252, 0.12);
  --ml-border-strong: rgba(240, 246, 252, 0.26);
  --ml-hover: rgba(240, 246, 252, 0.07);
  --ml-active-bg: rgba(139, 147, 255, 0.16);
  --ml-tip-bg: #e6edf3;
  --ml-tip-fg: #0d1117;
  --ml-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 6px 20px rgba(0, 0, 0, 0.35);
  --ml-shadow-lg: 0 2px 6px rgba(0, 0, 0, 0.35), 0 16px 40px rgba(0, 0, 0, 0.5);
}
:host(:fullscreen) { background: var(--ml-page-bg); }

* { box-sizing: border-box; }

.frame {
  position: relative;
  height: 240px;
  border: 1px solid var(--ml-border);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.15s ease;
  container-type: inline-size;
}
.frame:hover, .frame.engaged { border-color: var(--ml-border-strong); }
.frame:focus-visible { border-color: var(--ml-accent); }
:host(:fullscreen) .frame { height: 100% !important; border: 0; border-radius: 0; }

.viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.viewport.grabbing { cursor: grabbing; }
.viewport {
  /* Match the blank document Mermaid measured text in (see renderer.ts). */
  font: initial;
  line-height: normal;
  color: initial;
  letter-spacing: normal;
}
.viewport > svg { display: block; width: 100%; height: 100%; max-width: none !important; }

/* ---------- floating UI ---------- */
.ui { opacity: 0; transform: translateY(-2px); transition: opacity 0.16s ease, transform 0.16s ease; pointer-events: none; }
.frame:hover .ui, .frame:focus-within .ui, .frame.engaged .ui, :host(:fullscreen) .ui {
  opacity: 1; transform: none; pointer-events: auto;
}
.bar {
  position: absolute;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: var(--ml-surface);
  -webkit-backdrop-filter: blur(14px) saturate(1.5);
  backdrop-filter: blur(14px) saturate(1.5);
  border: 1px solid var(--ml-border);
  border-radius: 12px;
  box-shadow: var(--ml-shadow);
}
.toolbar { top: 10px; right: 10px; }
.zoombar { bottom: 10px; right: 10px; padding: 3px; border-radius: 10px; }
.sep { width: 1px; align-self: stretch; margin: 5px 3px; background: var(--ml-border); }

button { font: inherit; color: inherit; }
.btn, .zoom-label {
  all: unset;
  box-sizing: border-box;
  position: relative;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  color: var(--ml-muted);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.btn.sm { width: 26px; height: 26px; border-radius: 7px; }
.zoom-label {
  width: auto;
  min-width: 46px;
  height: 26px;
  padding: 0 4px;
  font: 500 11.5px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.btn:hover, .zoom-label:hover { background: var(--ml-hover); color: var(--ml-text); }
.btn:focus-visible, .zoom-label:focus-visible, .item:focus-visible, .seg button:focus-visible, .swatch:focus-visible {
  outline: 2px solid var(--ml-accent); outline-offset: -2px;
}
.btn.on, .btn[aria-expanded="true"] { background: var(--ml-active-bg); color: var(--ml-accent); }
.btn .dot {
  position: absolute; right: 4px; bottom: 4px; width: 7px; height: 7px; border-radius: 50%;
  background: var(--ml-hl); box-shadow: 0 0 0 1.5px var(--ml-surface-solid); display: none;
}
.btn.on .dot { display: block; }

[data-tip]:hover::after {
  content: attr(data-tip);
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 6;
  white-space: nowrap;
  font: 500 11.5px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  padding: 5px 8px;
  border-radius: 6px;
  background: var(--ml-tip-bg);
  color: var(--ml-tip-fg);
  pointer-events: none;
  animation: ml-tip 0.12s ease 0.4s both;
}
.zoombar [data-tip]:hover::after { top: auto; bottom: calc(100% + 8px); }
[aria-expanded="true"][data-tip]:hover::after { display: none; }
@keyframes ml-tip { from { opacity: 0; transform: translateY(-2px); } }

.hint {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 2;
  max-width: calc(100% - 200px);
  padding: 5px 9px;
  font-size: 11.5px;
  color: var(--ml-muted);
  background: var(--ml-surface);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  border: 1px solid var(--ml-border);
  border-radius: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}
.hint.show { opacity: 1; transform: none; }
@container (max-width: 520px) { .hint { display: none; } }
kbd {
  font: 500 10.5px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  padding: 2px 4px;
  border-radius: 4px;
  border: 1px solid var(--ml-border-strong);
  border-bottom-width: 2px;
}

/* ---------- popovers ---------- */
.pop {
  position: absolute;
  top: 56px;
  right: 10px;
  z-index: 5;
  width: 272px;
  padding: 14px;
  background: var(--ml-surface-solid);
  border: 1px solid var(--ml-border);
  border-radius: 12px;
  box-shadow: var(--ml-shadow-lg);
  display: none;
}
.pop.open { display: block; animation: ml-pop 0.14s ease-out; }
@keyframes ml-pop { from { opacity: 0; transform: translateY(-4px) scale(0.98); } }
.pop.menu { padding: 6px; width: 260px; }
.pop h4 {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ml-muted);
}
.row { margin-top: 14px; }
.seg {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 2px;
  padding: 2px;
  background: var(--ml-hover);
  border-radius: 8px;
  transition: opacity 0.15s;
}
.seg button {
  all: unset;
  padding: 6px 4px;
  border-radius: 6px;
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: var(--ml-muted);
  cursor: pointer;
}
.seg button:hover { color: var(--ml-text); }
.seg button[aria-checked="true"] {
  background: var(--ml-surface-solid);
  color: var(--ml-text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--ml-border);
}
.seg.disabled { opacity: 0.4; pointer-events: none; }
.swatches { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.swatch {
  all: unset;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--c);
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.14);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.swatch:hover { transform: scale(1.12); }
.swatch[aria-checked="true"] { box-shadow: 0 0 0 2px var(--ml-surface-solid), 0 0 0 4px var(--c); }
.custom {
  position: relative;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: conic-gradient(#ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #6366f1, #a855f7, #ec4899, #ef4444);
  cursor: pointer;
}
.custom[aria-checked="true"] { box-shadow: 0 0 0 2px var(--ml-surface-solid), 0 0 0 4px var(--ml-hl); }
.custom input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; border: 0; padding: 0; cursor: pointer; }
.note { margin: 14px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--ml-muted); }

.item {
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--ml-text);
  cursor: pointer;
}
.item:hover { background: var(--ml-hover); }
.item > svg { flex: none; color: var(--ml-muted); }
.item[disabled] { opacity: 0.4; pointer-events: none; }
.item .label { flex: 1; min-width: 0; }
.item .sub { display: block; margin-top: 1px; font-size: 11.5px; color: var(--ml-muted); }
.divider { height: 1px; margin: 6px 4px; background: var(--ml-border); }
.switch {
  flex: none;
  position: relative;
  width: 30px;
  height: 18px;
  border-radius: 9px;
  background: var(--ml-border-strong);
  transition: background 0.15s ease;
}
.switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease;
}
[aria-checked="true"] > .switch { background: var(--ml-accent); }
[aria-checked="true"] > .switch::after { transform: translateX(12px); }

.toast {
  position: absolute;
  left: 50%;
  bottom: 14px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px 7px 10px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ml-tip-fg);
  background: var(--ml-tip-bg);
  border-radius: 999px;
  box-shadow: var(--ml-shadow);
  opacity: 0;
  transform: translate(-50%, 6px);
  transition: opacity 0.18s ease, transform 0.18s ease;
  pointer-events: none;
  white-space: nowrap;
}
.toast.show { opacity: 1; transform: translate(-50%, 0); }

/* ---------- diagram: highlight ---------- */
svg .ml-hit { fill: none !important; stroke: transparent !important; stroke-width: 14px !important; pointer-events: stroke; }
svg g.node, svg g.cluster, svg .ml-edge, svg .ml-elabel { transition: opacity 0.2s ease; }
svg.ml-hl-enabled g.node, svg.ml-hl-enabled .ml-hit, svg.ml-hl-enabled .ml-elabel, svg.ml-hl-enabled .cluster-label { cursor: pointer; }
svg.ml-has-hl g.node:not(.ml-on),
svg.ml-has-hl .ml-edge:not(.ml-on),
svg.ml-has-hl .ml-elabel:not(.ml-on) { opacity: 0.16; }
svg.ml-has-hl g.cluster:not(.ml-on) { opacity: 0.5; }
svg g.node.ml-on > :is(rect, polygon, circle, ellipse, path),
svg g.node.ml-on > g:not(.label) :is(rect, polygon, circle, ellipse, path),
svg g.cluster.ml-on > :is(rect, polygon, path) {
  stroke: var(--ml-hl) !important;
  stroke-width: 2.5px !important;
}
svg g.node.ml-sel, svg g.cluster.ml-sel {
  filter: drop-shadow(0 0 1px var(--ml-hl)) drop-shadow(0 0 6px var(--ml-hl));
}
svg .ml-edge.ml-on { stroke: var(--ml-hl) !important; stroke-width: 3px !important; }
svg .ml-edge.ml-sel { stroke-width: 4px !important; }

/* ---------- diagram: flowing edges ---------- */
svg.ml-flowing:not(.ml-has-hl) .ml-edge,
svg.ml-flowing.ml-has-hl .ml-edge.ml-on {
  stroke-dasharray: 9 7 !important;
  animation: ml-flow 0.8s linear infinite !important;
}
@keyframes ml-flow { to { stroke-dashoffset: -16; } }
`;
