import { addHitAreas, type GEdge, type GNode, type Graph } from './graph';

interface Range {
  top: number;
  bottom: number;
}

interface Branch extends Range {
  node: GNode;
  decision: GNode;
}

function inRange(range: Range, y: number) {
  return range.top <= y && y < range.bottom;
}

function compatible(a: Branch[], b: Branch[]) {
  return a.every((first) => b.every((second) => first.decision !== second.decision || first === second));
}

export function extractSequence(svg: SVGSVGElement): Graph | null {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];
  const byElement: Graph['byElement'] = new Map();

  function addPart(node: GNode, el: SVGElement, styleClass: string) {
    if (byElement.has(el)) return;
    if (el !== node.el) (node.parts ??= []).push(el);
    el.classList.add('ml-sequence-target', styleClass);
    byElement.set(el, node);
  }

  function addNode(el: SVGGraphicsElement, styleClass: string): GNode {
    const node: GNode = { kind: 'node', id: String(nodes.length), el, cluster: false, in: [], out: [] };
    nodes.push(node);
    addPart(node, el, styleClass);
    return node;
  }

  const participants = new Map<string, GNode>();
  const lifelines = new Map<GNode, number>();
  for (const el of svg.querySelectorAll<SVGGraphicsElement>('[data-et="participant"], .actor-top, .actor-bottom, line.actor-line')) {
    const part = el.closest<SVGGraphicsElement>('[data-et="participant"]') ??
      (el.localName === 'rect' ? el.closest<SVGGElement>('g') : el);
    const id = part?.dataset.id ?? el.getAttribute('name');
    if (!id || !part) continue;
    const node = participants.get(id) ?? addNode(part, 'ml-sequence-participant');
    participants.set(id, node);
    addPart(node, part, 'ml-sequence-participant');
    if (el instanceof SVGLineElement) lifelines.set(node, el.x1.baseVal.value);
  }

  function endpoint(id: string | undefined, x: number) {
    if (id !== undefined) return participants.get(id);
    // Older page-rendered Mermaid SVGs only expose the geometry.
    let nearest: GNode | undefined;
    let distance = Infinity;
    for (const [node, center] of lifelines) {
      const offset = Math.abs(center - x);
      if (offset < distance) {
        nearest = node;
        distance = offset;
      }
    }
    return nearest;
  }

  const branches: Branch[] = [];
  const ranges = new Map<GNode, Range>();
  // Mermaid renders an alt as an outer frame and horizontal branch separators.
  for (const label of svg.querySelectorAll<SVGTextElement>('text.labelText')) {
    if (label.textContent?.trim() !== 'alt') continue;
    const frame = label.parentElement!;
    const lines = [...frame.querySelectorAll<SVGLineElement>(':scope > line.loopLine')]
      .filter((el) => el.y1.baseVal.value === el.y2.baseVal.value && el.x1.baseVal.value !== el.x2.baseVal.value)
      .sort((a, b) => a.y1.baseVal.value - b.y1.baseVal.value);
    if (lines.length < 2) continue;
    const decision = addNode(label, 'ml-sequence-guard');
    const badge = frame.querySelector<SVGElement>('.labelBox');
    if (badge) addPart(decision, badge, 'ml-sequence-divider');
    ranges.set(decision, { top: lines[0].y1.baseVal.value, bottom: lines.at(-1)!.y1.baseVal.value });
    const choices: Branch[] = [];
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const top = line.y1.baseVal.value;
      const bottom = lines[i + 1].y1.baseVal.value;
      const node = addNode(line, 'ml-sequence-divider');
      const branch = { top, bottom, node, decision };
      ranges.set(node, branch);
      choices.push(branch);
    }
    for (const title of frame.querySelectorAll<SVGGraphicsElement>(':scope > .loopText, :scope > .sectionTitle')) {
      const box = title.getBBox();
      const branch = choices.find((choice) => inRange(choice, box.y + box.height / 2));
      if (branch) addPart(branch.node, title, 'ml-sequence-guard');
    }
    branches.push(...choices);
  }

  const times = new Map<GEdge, number>();
  const contexts = new Map<GEdge, Branch[]>();
  const byBranchIds = new Map<string, Branch[]>();
  const addLabel = (edge: GEdge, label: Element) => {
    edge.labels.push(label);
    label.classList.add('ml-elabel', 'ml-sequence-target');
    byElement.set(label, edge);
  };
  for (const el of svg.querySelectorAll<SVGGeometryElement>(':is(line, path):is(.messageLine0, .messageLine1)')) {
    const length = el.getTotalLength();
    if (!length) continue;
    const start = el.getPointAtLength(0);
    const end = el.getPointAtLength(length);
    const edge: GEdge = {
      kind: 'edge', el, labels: [],
      from: endpoint(el.dataset.from, start.x),
      to: endpoint(el.dataset.to, end.x),
    };
    edge.from?.out.push(edge);
    edge.to?.in.push(edge);
    el.classList.add('ml-edge', 'ml-sequence-target');
    byElement.set(el, edge);
    edges.push(edge);
    times.set(edge, start.y);
    const enclosing = branches.filter((branch) => inRange(branch, start.y));
    const key = enclosing.map(({ node }) => node.id).join(',');
    if (!byBranchIds.has(key)) byBranchIds.set(key, enclosing);
    contexts.set(edge, byBranchIds.get(key)!);

    // Labels precede the arrow, including when Mermaid wraps one into several lines.
    for (let prev = el.previousElementSibling; prev?.matches('.messageText'); prev = prev.previousElementSibling) {
      addLabel(edge, prev);
    }
    let next = el.nextElementSibling;
    if (next?.matches('g:has(> circle[cy])')) {
      addLabel(edge, next);
      next = next.nextElementSibling;
    }
    if (next?.matches('line[marker-start$="-sequencenumber)"]') && next.nextElementSibling?.matches('.sequenceNumber')) {
      addLabel(edge, next);
      addLabel(edge, next.nextElementSibling);
    }
  }
  if (!edges.length && !nodes.length) return null;
  addHitAreas(edges, byElement);

  const forward = [...edges].sort((a, b) => times.get(a)! - times.get(b)!);
  const backward = [...forward].reverse();
  const expand: NonNullable<Graph['expand']> = (selection, mode, direction) => {
    const litNodes = new Set(selection.nodes);
    const litEdges = new Set<GEdge>();

    const trace = (starting: GEdge[], scope: Branch[]) => {
      starting.forEach((edge) => litEdges.add(edge));
      if (mode !== 'flow' || !starting.length) return;
      const seeds = new Set(starting);

      const walk = (ordered: GEdge[], enter: 'from' | 'to', leave: 'from' | 'to') => {
        const reached = new Map<GNode, Set<Branch[]>>();
        for (const edge of ordered) {
          const branchPath = contexts.get(edge)!;
          if (!compatible(scope, branchPath)) continue;
          const [entry, exit] = [edge[enter], edge[leave]];
          if (!seeds.has(edge) && (!entry || ![...(reached.get(entry) ?? [])].some((prev) => compatible(prev, branchPath)))) continue;
          litEdges.add(edge);
          if (!exit) continue;
          const paths = reached.get(exit) ?? new Set<Branch[]>();
          paths.add(branchPath);
          reached.set(exit, paths);
        }
      };
      if (direction !== 'up') walk(forward, 'from', 'to');
      if (direction !== 'down') walk(backward, 'to', 'from');
    };

    for (const edge of selection.edges) trace([edge], contexts.get(edge)!);
    for (const node of selection.nodes) {
      const range = ranges.get(node);
      if (range) {
        const scope = branches.filter((branch) => branch.top <= range.top && range.bottom <= branch.bottom);
        for (const branch of scope) {
          litNodes.add(branch.node);
          litNodes.add(branch.decision);
        }
        trace(forward.filter((edge) => inRange(range, times.get(edge)!)), scope);
      } else {
        trace([
          ...(direction !== 'up' ? node.out : []),
          ...(direction !== 'down' ? node.in : []),
        ], []);
      }
    }
    for (const edge of litEdges) {
      if (edge.from) litNodes.add(edge.from);
      if (edge.to) litNodes.add(edge.to);
      for (const { node, decision } of contexts.get(edge)!) {
        litNodes.add(node);
        litNodes.add(decision);
      }
    }
    return { nodes: litNodes, edges: litEdges };
  };
  return { nodes, edges, byElement, expand };
}
