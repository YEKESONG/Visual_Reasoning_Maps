import ELK from "elkjs/lib/elk.bundled.js";
import { layoutInput } from "./graph";
import type { Step, Link } from "./api";
const elk = new ELK();
self.onmessage = async (
  event: MessageEvent<{ steps: Step[]; links: Link[]; expanded: string[] }>,
) => {
  try {
    const { steps, links, expanded } = event.data;
    const result = await elk.layout(layoutInput(steps, links, expanded));
    self.postMessage({ children: result.children });
  } catch {
    self.postMessage({
      error:
        "Le placement de la carte a échoué. Réduisez les sous-processus puis réessayez.",
    });
  }
};
