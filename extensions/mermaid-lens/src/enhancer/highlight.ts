import { expand, type GEdge, type GNode, type Graph, type Selection } from './graph';
import type { Direction, HighlightMode } from '../shared/settings';

/**
 * Applies highlight classes to a diagram. All the visual work is done in CSS
 * (see styles.ts) keyed off these classes plus the `--ml-hl` custom property.
 */
export class Highlighter {
  private sel: Selection = { nodes: new Set(), edges: new Set() };
  private lit = { nodes: new Set<GNode>(), edges: new Set<GEdge>() };
  private markerClones = new Map<string, string>();

  constructor(
    private svg: SVGSVGElement,
    private graph: Graph,
    private mode: HighlightMode,
    private direction: Direction,
  ) {}

  get active(): boolean {
    return this.sel.nodes.size + this.sel.edges.size > 0;
  }

  configure(mode: HighlightMode, direction: Direction) {
    if (mode === this.mode && direction === this.direction) return;
    this.mode = mode;
    this.direction = direction;
    if (mode === 'off') this.clear();
    else this.apply();
  }

  /** Select a node or edge; `additive` (shift-click) toggles it within the selection. */
  select(item: GNode | GEdge, additive: boolean) {
    const set = (item.kind === 'node' ? this.sel.nodes : this.sel.edges) as Set<GNode | GEdge>;
    const soleSelection = set.has(item) && this.sel.nodes.size + this.sel.edges.size === 1;
    if (additive) {
      if (set.has(item)) set.delete(item);
      else set.add(item);
    } else {
      this.sel.nodes.clear();
      this.sel.edges.clear();
      if (!soleSelection) set.add(item); // clicking the only selected item again deselects it
    }
    this.apply();
  }

  clear() {
    this.sel = { nodes: new Set(), edges: new Set() };
    this.apply();
  }

  private apply() {
    const next =
      this.mode === 'off' || !this.active
        ? { nodes: new Set<GNode>(), edges: new Set<GEdge>() }
        : expand(this.sel, this.mode, this.direction);

    for (const n of this.graph.nodes) {
      n.el.classList.toggle('ml-on', next.nodes.has(n));
      n.el.classList.toggle('ml-sel', this.sel.nodes.has(n));
    }
    for (const e of this.graph.edges) {
      const on = next.edges.has(e);
      if (on !== this.lit.edges.has(e)) this.swapMarkers(e.el, on);
      e.el.classList.toggle('ml-on', on);
      e.el.classList.toggle('ml-sel', this.sel.edges.has(e));
      for (const l of e.labels) l.classList.toggle('ml-on', on);
    }
    this.lit = next;
    this.svg.classList.toggle('ml-has-hl', next.nodes.size + next.edges.size > 0);
  }

  /** Arrowheads are shared <marker>s; point lit edges at recoloured copies. */
  private swapMarkers(path: SVGPathElement, on: boolean) {
    for (const attr of ['marker-start', 'marker-end', 'marker-mid']) {
      if (on) {
        const v = path.getAttribute(attr);
        const id = v?.match(/url\(["']?#([^"')]+)["']?\)/)?.[1];
        if (!id) continue;
        const clone = this.markerClone(id, path);
        if (!clone) continue;
        path.setAttribute(`data-ml-${attr}`, v!);
        path.setAttribute(attr, `url(#${clone})`);
      } else {
        const orig = path.getAttribute(`data-ml-${attr}`);
        if (orig === null) continue;
        path.setAttribute(attr, orig);
        path.removeAttribute(`data-ml-${attr}`);
      }
    }
  }

  private markerClone(id: string, path: SVGPathElement): string | null {
    const cached = this.markerClones.get(id);
    if (cached) return cached;
    const marker = [...this.svg.querySelectorAll('marker')].find((m) => m.id === id);
    if (!marker) return null;
    const clone = marker.cloneNode(true) as SVGMarkerElement;
    clone.id = `${id}--ml-hl`;
    marker.after(clone);

    // Recolour strokes, and fills that match the line colour (solid arrowheads),
    // leaving hollow shapes (e.g. UML inheritance triangles) hollow.
    const lineColour = getComputedStyle(path).stroke;
    const originals = [marker, ...marker.querySelectorAll('*')];
    [clone, ...clone.querySelectorAll('*')].forEach((el, i) => {
      const cs = getComputedStyle(originals[i]);
      const s = (el as SVGElement).style;
      if (cs.stroke && cs.stroke !== 'none') s.setProperty('stroke', 'var(--ml-hl)', 'important');
      if (cs.fill && cs.fill !== 'none' && (cs.fill === lineColour || cs.fill === cs.stroke))
        s.setProperty('fill', 'var(--ml-hl)', 'important');
    });
    this.markerClones.set(id, clone.id);
    return clone.id;
  }
}
