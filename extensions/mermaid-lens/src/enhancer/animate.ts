import type { GNode, Graph } from './graph';

/** Rough length, in seconds, of a build-up at `scale` 1 (the timings below are tuned for it). */
export const BASE_BUILD_SECONDS = 3.2;

/**
 * "Build-up" replay: nodes fade in level by level (breadth-first from the
 * diagram's sources) and edges draw themselves from source to target.
 * Diagrams without a graph (sequence, gantt, pie, ...) reveal element by element.
 */
export class BuildAnimation {
  private running: Animation[] = [];
  private timers: number[] = [];
  private restore: (() => void)[] = [];

  private scale = 1;

  constructor(private svg: SVGSVGElement) {}

  get playing(): boolean {
    return this.running.some((a) => a.playState === 'running');
  }

  stop() {
    this.running.forEach((a) => a.cancel());
    this.timers.forEach((t) => clearTimeout(t));
    this.restore.forEach((r) => r());
    this.running = [];
    this.timers = [];
    this.restore = [];
  }

  /** `scale` stretches or shrinks every delay and duration (1 ≈ BASE_BUILD_SECONDS). */
  play(graph: Graph | null, onDone?: () => void, scale = 1) {
    this.stop();
    this.scale = scale;
    const total = graph ? this.playGraph(graph) : this.playGeneric();
    this.timers.push(window.setTimeout(() => {
      this.stop();
      onDone?.();
    }, total + 50));
  }

  private fade(el: Element, delay: number, duration: number) {
    this.running.push(
      el.animate([{ opacity: 0 }, { opacity: 1 }], { delay, duration, easing: 'ease-out', fill: 'backwards' }),
    );
  }

  private playGraph(graph: Graph): number {
    const level = levels(graph);
    const maxLevel = Math.max(0, ...level.values());
    const step = Math.min(520, Math.max(160, 3200 / (maxLevel + 1))) * this.scale;

    for (const n of graph.nodes) {
      if (n.cluster) this.fade(n.el, 0, step * 2);
      else this.fade(n.el, (level.get(n) ?? 0) * step, step * 0.9);
    }

    for (const e of graph.edges) {
      const start = ((e.from && level.get(e.from)) ?? 0) * step + step * 0.6;
      const len = safeLength(e.el);
      const duration = step * 0.9;

      // Hide arrowheads until the line has finished drawing.
      const markers = ['marker-start', 'marker-end'].map((a) => [a, e.el.getAttribute(a)] as const);
      markers.forEach(([a, v]) => v && e.el.removeAttribute(a));
      const putBack = () => markers.forEach(([a, v]) => v && e.el.setAttribute(a, v));
      this.restore.push(putBack);
      this.timers.push(window.setTimeout(putBack, start + duration));

      if (len > 0) {
        this.running.push(
          e.el.animate(
            [
              { strokeDasharray: `${len} ${len}`, strokeDashoffset: len },
              { strokeDasharray: `${len} ${len}`, strokeDashoffset: 0 },
            ],
            { delay: start, duration, easing: 'ease-in-out', fill: 'backwards' },
          ),
        );
      } else {
        this.fade(e.el, start, duration);
      }
      for (const l of e.labels) this.fade(l, start + duration * 0.5, duration * 0.6);
    }
    return (maxLevel + 1) * step + step;
  }

  private playGeneric(): number {
    const root = this.svg.querySelector(':scope > g') ?? this.svg;
    let items = [...this.svg.children].filter((c) => !/^(style|defs|title|desc)$/i.test(c.tagName));
    if (items.length === 1 && root.children.length > 1) items = [...root.children];
    items = items.slice(0, 400);
    const step = Math.min(220, Math.max(12, 2600 / Math.max(1, items.length))) * this.scale;
    const duration = Math.max(180 * this.scale, step * 2);
    items.forEach((el, i) => this.fade(el, i * step, duration));
    return items.length * step + duration;
  }
}

function safeLength(p: SVGPathElement): number {
  try {
    return p.getTotalLength();
  } catch {
    return 0;
  }
}

/** Breadth-first depth of every node, starting from nodes with no incoming edges. */
function levels(graph: Graph): Map<GNode, number> {
  const level = new Map<GNode, number>();
  const real = graph.nodes.filter((n) => !n.cluster);
  const visit = (roots: GNode[]) => {
    const queue = [...roots];
    roots.forEach((r) => level.set(r, level.get(r) ?? 0));
    while (queue.length) {
      const n = queue.shift()!;
      for (const e of n.out) {
        if (e.to && !level.has(e.to)) {
          level.set(e.to, level.get(n)! + 1);
          queue.push(e.to);
        }
      }
    }
  };
  visit(real.filter((n) => n.in.every((e) => !e.from || e.from === n)));
  // Cycles with no entry point: start from whatever is left, in document order.
  for (const n of real) if (!level.has(n)) visit([n]);
  return level;
}
