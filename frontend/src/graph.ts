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
export function layoutInput(steps: Step[], links: Link[], expanded: string[]) {
  const visible = visibleSteps(steps, expanded);
  const ids = new Set(visible.map((s) => s.id));
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
                "elk.padding": "[top=120,left=20,bottom=20,right=20]",
                "elk.direction": "DOWN",
              },
              children: children.map((c) => ({
                id: c.id,
                width: 235,
                height: 108,
              })),
            }
          : { id: s.id, width: 235, height: 118 };
      }),
    edges: links
      .filter(
        (e) => e.type !== "contradict" && ids.has(e.src) && ids.has(e.dst),
      )
      .map((e) => ({ id: e.id, sources: [e.src], targets: [e.dst] })),
  };
}
