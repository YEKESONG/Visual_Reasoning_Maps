import { describe, expect, it } from "vitest";
import graph from "../../examples/demo-descartes-html/flow.json";
import suggestions from "../../examples/demo-descartes-html/suggestions.json";
import parsed from "../../examples/demo-descartes-html/parsed.json";
import { messages } from "./translations";
import { translate } from "./i18n";

describe("locale catalog", () => {
  it("keeps the same interpolation tokens in all three languages", () => {
    const tokens = (s: string) =>
      [...s.matchAll(/\{(\w+)\}/g)]
        .map((m) => m[1])
        .filter((x) => x !== "plural")
        .sort();
    for (const [fr, entry] of Object.entries(messages)) {
      for (const value of [entry.en, entry.zh]) {
        expect(value.length).toBeGreaterThan(0);
        expect(tokens(value), fr).toEqual(tokens(fr));
      }
    }
  });
  it("handles counts and preserves unknown document content", () => {
    expect(translate("{count} passage{plural}", "en", { count: 1 })).toBe(
      "1 passage",
    );
    expect(translate("{count} passage{plural}", "fr", { count: 2 })).toBe(
      "2 passages",
    );
    expect(translate("{count} passage{plural}", "zh", { count: 2 })).toBe(
      "2 处原文",
    );
    expect(translate("A source sentence.", "zh")).toBe("A source sentence.");
  });
  it("covers all editorial demonstration prose without translating evidence", () => {
    const prose = [
      graph.metadata.title,
      graph.thesis,
      ...parsed.warnings,
      ...graph.steps.flatMap((s: { label: string; summary: string }) => [
        s.label,
        s.summary,
      ]),
      ...graph.terms.flatMap((t: { term: string; definition: string }) => [
        t.term,
        t.definition,
      ]),
      ...suggestions.map((s: { message: string }) => s.message),
    ];
    for (const text of prose) expect(text in messages, text).toBe(true);
  });
});
