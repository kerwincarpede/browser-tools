/**
 * Recovers a node/edge graph from a rendered Mermaid SVG so we can highlight
 * neighbours and flows. Works for flowcharts, state, class and ER diagrams
 * (anything drawn with `g.node` shapes and edge paths).
 *
 * Edges are matched to nodes semantically when Mermaid's ids allow it
 * (flowchart `L_<from>_<to>_<n>` ids), and geometrically otherwise: each end of
 * an edge path is attached to the node box it touches.
 */

export interface GNode {
  kind: 'node';
  id: string;
  el: SVGGraphicsElement;
  /** Other rendered elements representing this item, such as a mirrored participant. */
  parts?: SVGElement[];
  /** True for subgraphs / composite states. */
  cluster: boolean;
  out: GEdge[];
  in: GEdge[];
}

export interface GEdge {
  kind: 'edge';
  el: SVGGeometryElement;
  labels: Element[];
  from?: GNode;
  to?: GNode;
}

export interface Graph {
  nodes: GNode[];
  edges: GEdge[];
  /** Maps any clickable element (node group, hit path, label) to its graph item. */
  byElement: Map<Element, GNode | GEdge>;
  expand?: typeof expand;
}

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const EDGE_SELECTOR = [
  'path[data-edge="true"]',
  'path.flowchart-link',
  '.edgePaths path',
  '.edgePath path',
  'path.transition',
  'path.relation',
  'path.relationshipLine',
].join(',');

/** Root-space transform of an element (works without layout, unlike getScreenCTM). */
function matrixToRoot(el: SVGGraphicsElement, svg: SVGSVGElement): DOMMatrix {
  let m = new DOMMatrix();
  let cur: Element | null = el;
  while (cur && cur !== svg) {
    const t = (cur as SVGGraphicsElement).transform?.baseVal?.consolidate();
    if (t) m = DOMMatrix.fromMatrix(t.matrix).multiply(m);
    cur = cur.parentElement;
  }
  return m;
}

/** getPointAtLength returns an SVGPoint, which only accepts SVGMatrix; go via DOMPoint. */
function pointAt(path: SVGGeometryElement, at: number, m: DOMMatrix): DOMPoint {
  const p = path.getPointAtLength(at);
  return new DOMPoint(p.x, p.y).matrixTransform(m);
}

function rootBox(el: SVGGraphicsElement, svg: SVGSVGElement): Box | null {
  let b: DOMRect;
  try {
    b = el.getBBox();
  } catch {
    return null;
  }
  if (!b.width && !b.height) return null;
  const m = matrixToRoot(el, svg);
  const pts = [
    new DOMPoint(b.x, b.y),
    new DOMPoint(b.x + b.width, b.y),
    new DOMPoint(b.x, b.y + b.height),
    new DOMPoint(b.x + b.width, b.y + b.height),
  ].map((p) => p.matrixTransform(m));
  return {
    x1: Math.min(...pts.map((p) => p.x)),
    y1: Math.min(...pts.map((p) => p.y)),
    x2: Math.max(...pts.map((p) => p.x)),
    y2: Math.max(...pts.map((p) => p.y)),
  };
}

/** Distance from a point to a box (0 when inside). */
function outsideDist(b: Box, x: number, y: number): number {
  const dx = Math.max(b.x1 - x, 0, x - b.x2);
  const dy = Math.max(b.y1 - y, 0, y - b.y2);
  return Math.hypot(dx, dy);
}

/** Distance from a point to the border of a box (edges into subgraphs end on the border). */
function borderDist(b: Box, x: number, y: number): number {
  const out = outsideDist(b, x, y);
  if (out > 0) return out;
  return Math.min(x - b.x1, b.x2 - x, y - b.y1, b.y2 - y);
}

/** Strip Mermaid's `<svgId>-` prefix, the diagram-type prefix and the trailing counter. */
function semanticId(el: Element, svgId: string): string {
  let id = el.id || '';
  if (svgId && id.startsWith(svgId + '-')) id = id.slice(svgId.length + 1);
  // flowchart-A-0, state-Still-1, classId-Animal-0, entity-CUSTOMER-0
  const m = id.match(/^(?:flowchart|state|classId|entity)-(.+)-\d+$/);
  return m ? m[1] : id;
}

export function extractGraph(svg: SVGSVGElement): Graph | null {
  const svgId = svg.id;
  const nodeEls = [...svg.querySelectorAll<SVGGElement>('g.node')].filter((n) => !n.closest('defs, marker'));
  if (nodeEls.length === 0) return null;
  const clusterEls = [...svg.querySelectorAll<SVGGElement>('g.cluster')];

  const nodes: (GNode & { box: Box })[] = [];
  const byId = new Map<string, GNode>();
  const byElement = new Map<Element, GNode | GEdge>();

  for (const [el, cluster] of [
    ...nodeEls.map((e) => [e, false] as const),
    ...clusterEls.map((e) => [e, true] as const),
  ]) {
    const box = rootBox(el, svg);
    if (!box) continue;
    const node = { kind: 'node' as const, id: semanticId(el, svgId), el, cluster, box, out: [], in: [] };
    nodes.push(node);
    byId.set(node.id, node);
    byElement.set(el, node);
  }

  const nearest = (x: number, y: number): GNode | undefined => {
    let best: GNode | undefined;
    let bestD = Infinity;
    for (const n of nodes) {
      // Prefer real nodes slightly over clusters at equal distance.
      const d = (n.cluster ? borderDist(n.box, x, y) : outsideDist(n.box, x, y)) + (n.cluster ? 0.5 : 0);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return bestD <= 40 ? best : undefined;
  };

  /** Flowchart ids look like L_<from>_<to>_<n>; node ids may themselves contain `_`. */
  const semanticEnds = (edgeId: string): [GNode, GNode] | null => {
    const m = edgeId.match(/^L_(.+)_\d+$/);
    if (!m) return null;
    const parts = m[1].split('_');
    let found: [GNode, GNode] | null = null;
    for (let i = 1; i < parts.length; i++) {
      const a = byId.get(parts.slice(0, i).join('_'));
      const b = byId.get(parts.slice(i).join('_'));
      if (a && b) {
        if (found) return null; // ambiguous
        found = [a, b];
      }
    }
    return found;
  };

  const seen = new Set<Element>();
  const edges: GEdge[] = [];
  for (const el of svg.querySelectorAll<SVGPathElement>(EDGE_SELECTOR)) {
    if (seen.has(el) || el.closest('defs, marker, g.node') || el.classList.contains('ml-hit')) continue;
    seen.add(el);
    const edge: GEdge = { kind: 'edge', el, labels: [] };
    const dataId = el.getAttribute('data-id') || el.id.replace(svgId + '-', '');
    const sem = semanticEnds(dataId);
    if (sem) {
      [edge.from, edge.to] = sem;
    } else {
      try {
        const len = el.getTotalLength();
        const m = matrixToRoot(el, svg);
        const p0 = pointAt(el, 0, m);
        const p1 = pointAt(el, len, m);
        edge.from = nearest(p0.x, p0.y);
        edge.to = nearest(p1.x, p1.y);
      } catch {
        /* path without geometry */
      }
    }
    edge.from?.out.push(edge);
    edge.to?.in.push(edge);
    el.classList.add('ml-edge');
    byElement.set(el, edge);
    edges.push(edge);
  }

  attachLabels(svg, edges, byElement);
  addHitAreas(edges, byElement);
  return { nodes, edges, byElement };
}

function attachLabels(svg: SVGSVGElement, edges: GEdge[], byElement: Map<Element, GNode | GEdge>) {
  const byDataId = new Map<string, GEdge>();
  for (const e of edges) {
    const id = e.el.getAttribute('data-id');
    if (id) byDataId.set(id, e);
  }
  const mids = edges.map((e) => {
    try {
      const p = pointAt(e.el, e.el.getTotalLength() / 2, matrixToRoot(e.el, svg));
      return { e, x: p.x, y: p.y };
    } catch {
      return null;
    }
  });

  for (const label of svg.querySelectorAll<SVGGElement>('g.edgeLabel')) {
    let edge = byDataId.get(label.querySelector('[data-id]')?.getAttribute('data-id') ?? '');
    if (!edge) {
      const box = rootBox(label, svg);
      if (!box) continue;
      const cx = (box.x1 + box.x2) / 2;
      const cy = (box.y1 + box.y2) / 2;
      let bestD = 60;
      for (const m of mids) {
        if (!m) continue;
        const d = Math.hypot(m.x - cx, m.y - cy);
        if (d < bestD) {
          bestD = d;
          edge = m.e;
        }
      }
    }
    if (!edge) continue;
    edge.labels.push(label);
    label.classList.add('ml-elabel');
    byElement.set(label, edge);
  }
}

/** Thin edges are hard to click; give each one a wide invisible twin. */
export function addHitAreas(edges: GEdge[], byElement: Map<Element, GNode | GEdge>) {
  for (const e of edges) {
    const hit = document.createElementNS('http://www.w3.org/2000/svg', e.el.localName);
    for (const name of ['d', 'x1', 'y1', 'x2', 'y2', 'transform']) {
      const value = e.el.getAttribute(name);
      if (value !== null) hit.setAttribute(name, value);
    }
    hit.setAttribute('class', 'ml-hit');
    e.el.after(hit);
    byElement.set(hit, e);
  }
}

export interface Selection {
  nodes: Set<GNode>;
  edges: Set<GEdge>;
}

/** Expand a selection into the set of highlighted nodes and edges. */
export function expand(
  sel: Selection,
  mode: 'neighbors' | 'flow',
  direction: 'both' | 'down' | 'up',
): { nodes: Set<GNode>; edges: Set<GEdge> } {
  const nodes = new Set<GNode>();
  const edges = new Set<GEdge>();
  const down = direction !== 'up';
  const up = direction !== 'down';

  const walk = (start: GNode, dir: 'out' | 'in') => {
    const queue = [start];
    const visited = new Set<GNode>([start]);
    while (queue.length) {
      const n = queue.shift()!;
      for (const e of n[dir]) {
        edges.add(e);
        const next = dir === 'out' ? e.to : e.from;
        if (!next) continue;
        nodes.add(next);
        if (mode === 'flow' && !visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  };

  for (const n of sel.nodes) {
    nodes.add(n);
    if (down) walk(n, 'out');
    if (up) walk(n, 'in');
  }
  for (const e of sel.edges) {
    edges.add(e);
    if (e.from) nodes.add(e.from);
    if (e.to) nodes.add(e.to);
    if (mode === 'flow') {
      if (down && e.to) walk(e.to, 'out');
      if (up && e.from) walk(e.from, 'in');
    }
  }
  return { nodes, edges };
}
