import type { Link, Step } from "./api";
export function reachable(
  id: string,
  links: Link[],
  direction: "up" | "down",
): Set<string> {
  const found = new Set([id]);
  const queue = [id];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of links) {
      if (edge.type === "contradict") continue;
      const from = direction === "up" ? edge.dst : edge.src;
      const to = direction === "up" ? edge.src : edge.dst;
      if (from === current && !found.has(to)) {
        found.add(to);
        queue.push(to);
      }
    }
  }
  return found;
}
export function topological(steps: Step[], links: Link[]): Step[] {
  const ids = new Set(steps.map((s) => s.id));
  const degree = new Map(steps.map((s) => [s.id, 0]));
  for (const e of links)
    if (e.type !== "contradict" && ids.has(e.src) && ids.has(e.dst))
      degree.set(e.dst, degree.get(e.dst)! + 1);
  const queue = steps.filter((s) => degree.get(s.id) === 0);
  const result: Step[] = [];
  while (queue.length) {
    const step = queue.shift()!;
    result.push(step);
    for (const e of links) {
      if (e.type === "contradict" || e.src !== step.id || !ids.has(e.dst))
        continue;
      degree.set(e.dst, degree.get(e.dst)! - 1);
      if (degree.get(e.dst) === 0)
        queue.push(steps.find((s) => s.id === e.dst)!);
    }
  }
  return [
    ...result,
    ...steps.filter((s) => !result.some((r) => r.id === s.id)),
  ];
}
export function visibleSteps(steps: Step[], expanded: string[]): Step[] {
  return steps.filter((s) => !s.parent || expanded.includes(s.parent));
}
export const NODE_WIDTH = 240;
// Rough text width in em: CJK glyphs take a full em, Latin letters about half.
export function nodeHeight(label: string): number {
  const units = [...label].reduce(
    (sum, c) => sum + (/[\u2e80-\u9fff\uf900-\uffef]/.test(c) ? 1 : 0.52),
    0,
  );
  const lines = Math.min(4, Math.max(1, Math.ceil((units * 17) / 204)));
  return 70 + lines * 22;
}
export function layoutInput(
  steps: Step[],
  links: Link[],
  expanded: string[],
  labels: Record<string, string> = {},
) {
  const visible = visibleSteps(steps, expanded);
  const ids = new Set(visible.map((s) => s.id));
  const height = (s: Step) => nodeHeight(labels[s.id] ?? s.label);
  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "36",
      "elk.layered.spacing.nodeNodeBetweenLayers": "70",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    },
    children: visible
      .filter((s) => !s.parent)
      .map((s) => {
        const children = visible.filter((c) => c.parent === s.id);
        return children.length
          ? {
              id: s.id,
              layoutOptions: {
                "elk.padding": `[top=${height(s) + 14},left=18,bottom=18,right=18]`,
                "elk.direction": "DOWN",
                "elk.spacing.nodeNode": "22",
              },
              children: children.map((c) => ({
                id: c.id,
                width: NODE_WIDTH,
                height: height(c),
              })),
            }
          : { id: s.id, width: NODE_WIDTH, height: height(s) };
      }),
    edges: links
      .filter(
        (e) => e.type !== "contradict" && ids.has(e.src) && ids.has(e.dst),
      )
      .map((e) => ({ id: e.id, sources: [e.src], targets: [e.dst] })),
  };
}
