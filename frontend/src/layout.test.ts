import { afterEach, describe, expect, it, vi } from "vitest";
import type { Step } from "./api";
import { messages } from "./translations";
import { WORKER_FAILED, startLayout } from "./layout";

const steps = [
  { id: "s1", label: "Une étape", type: "claim", anchors: ["p1s1"] },
] as Step[];

describe("map layout", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports a worker that cannot start instead of waiting forever", async () => {
    class BrokenWorker {
      onmessage: unknown = null;
      private listeners: (() => void)[] = [];
      constructor() {
        setTimeout(() => this.listeners.forEach((listener) => listener()), 0);
      }
      addEventListener(type: string, listener: () => void) {
        if (type === "error") this.listeners.push(listener);
      }
      postMessage() {}
      terminate() {}
    }
    vi.stubGlobal("Worker", BrokenWorker);
    const layout = startLayout(steps, [], [], { s1: "Une étape" });
    await expect(layout.result).rejects.toThrow(WORKER_FAILED);
    expect(WORKER_FAILED in messages).toBe(true);
    layout.stop();
  });
});
