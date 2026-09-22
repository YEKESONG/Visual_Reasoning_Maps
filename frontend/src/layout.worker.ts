import ELK from "elkjs/lib/elk-api.js";
import elkWorkerUrl from "elkjs/lib/elk-worker.min.js?url";
import { layoutInput } from "./graph";
import type { Step, Link } from "./api";
const elk = new ELK({ workerUrl: elkWorkerUrl });
self.onmessage = async (
  event: MessageEvent<{
    steps: Step[];
    links: Link[];
    expanded: string[];
    labels: Record<string, string>;
  }>,
) => {
  try {
    const { steps, links, expanded, labels } = event.data;
    const result = await elk.layout(
      layoutInput(steps, links, expanded, labels),
    );
    self.postMessage({ children: result.children });
  } catch {
    self.postMessage({
      error:
        "Le placement de la carte a échoué. Réduisez les sous-processus puis réessayez.",
    });
  }
};
