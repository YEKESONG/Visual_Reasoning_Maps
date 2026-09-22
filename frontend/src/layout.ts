import ELK from "elkjs/lib/elk-api.js";
import elkWorkerUrl from "elkjs/lib/elk-worker.min.js?url";
import type { ElkNode } from "elkjs";
import { layoutInput } from "./graph";
import type { Link, Step } from "./api";

export const WORKER_FAILED =
  "Le calcul de la disposition a échoué. Rechargez la page.";
export const LAYOUT_FAILED =
  "Le placement de la carte a échoué. Réduisez les sous-processus puis réessayez.";

/**
 * Places the visible steps with ELK, which runs in its own web worker.
 * The worker is started from the page itself: some embedded browsers cannot
 * start a worker from inside another worker, and the layout then never came
 * back. A worker that fails to load rejects instead of leaving the map empty.
 */
export function startLayout(
  steps: Step[],
  links: Link[],
  expanded: string[],
  labels: Record<string, string>,
): { result: Promise<ElkNode[]>; stop: () => void } {
  let fail: (error: Error) => void = () => {};
  const failed = new Promise<never>((_, reject) => (fail = reject));
  const elk = new ELK({
    workerUrl: elkWorkerUrl,
    workerFactory: (url) => {
      const worker = new Worker(url!);
      worker.addEventListener("error", () => fail(new Error(WORKER_FAILED)));
      return worker;
    },
  });
  const placed = elk.layout(layoutInput(steps, links, expanded, labels)).then(
    (graph) => graph.children ?? [],
    () => Promise.reject(new Error(LAYOUT_FAILED)),
  );
  return {
    result: Promise.race([placed, failed]),
    stop: () => elk.terminateWorker(),
  };
}
