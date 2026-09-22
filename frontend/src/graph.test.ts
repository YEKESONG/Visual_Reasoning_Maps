import { describe, expect, it } from "vitest";
import {
  layoutInput,
  nodeHeight,
  reachable,
  topological,
  visibleSteps,
} from "./graph";
import type { Step, Link } from "./api";
const steps = ["a", "b", "c"].map((id, i) => ({
  id,
  parent: null,
  type: "claim",
  label: id,
  summary: id,
  quote: id,
  anchors: ["p1s1"],
  confidence: 0.8,
  status: "to_verify",
  first_position: i,
})) as Step[];
const links = [
  { id: "ab", src: "a", dst: "b", type: "support" },
  { id: "bc", src: "b", dst: "c", type: "cause" },
  { id: "ca", src: "c", dst: "a", type: "contradict" },
] as Link[];
describe("graph navigation", () => {
  it("ignores symmetric contradiction in upstream traversal", () =>
    expect([...reachable("c", links, "up")]).toEqual(["c", "b", "a"]));
  it("finds downstream", () =>
    expect([...reachable("a", links, "down")]).toEqual(["a", "b", "c"]));
  it("orders directed relations", () =>
    expect(topological([...steps].reverse(), links).map((s) => s.id)).toEqual([
      "a",
      "b",
      "c",
    ]));
  it("collapses details and excludes contradiction from layout", () => {
    const all = [...steps, { ...steps[0], id: "child", parent: "a" }];
    expect(visibleSteps(all, [])).toHaveLength(3);
    expect(layoutInput(all, links, ["a"]).children[0].children).toHaveLength(1);
    expect(layoutInput(all, links, []).edges).toHaveLength(2);
  });
  it("sizes nodes to the label they display", () => {
    expect(nodeHeight("Short")).toBe(92);
    // Twenty CJK glyphs need two lines where twenty Latin letters need one.
    expect(nodeHeight("上下文崩塌：动作条件失效的一种新失败模式")).toBe(114);
    expect(nodeHeight("Context of the claim")).toBe(92);
    expect(nodeHeight("一".repeat(200))).toBe(70 + 4 * 22);
    const translated = { a: "一".repeat(30) };
    expect(layoutInput(steps, links, [], translated).children[0]).toMatchObject(
      {
        height: nodeHeight(translated.a),
      },
    );
  });
});
