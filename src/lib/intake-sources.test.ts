import { describe, expect, it } from "vitest";
import {
  createPdfSources,
  createTextSources,
  formatIntakeSources,
  isIntakeSources,
} from "./intake-sources";

describe("intake source passages", () => {
  it("labels pasted text and formats the same citations for AI prompts", () => {
    const sources = createTextSources("Problem statement.\n\nProposed mechanism.");

    expect(sources).toHaveLength(1);
    expect(sources[0].id).toBe("p1");
    expect(formatIntakeSources(sources)).toContain("[p1] Text passage 1");
    expect(isIntakeSources(sources)).toBe(true);
  });

  it("preserves PDF page numbers when creating passages", () => {
    const sources = createPdfSources([
      { page: 2, text: "First page detail." },
      { page: 5, text: "Later page detail." },
    ]);

    expect(sources.map((source) => source.page)).toEqual([2, 5]);
    expect(formatIntakeSources(sources)).toContain("[p2] Page 5");
    expect(isIntakeSources(sources)).toBe(true);
  });

  it("splits long source text and rejects oversized or invalid input", () => {
    const sources = createTextSources("technical detail ".repeat(150));

    expect(sources.length).toBeGreaterThan(1);
    expect(sources.every((source) => source.text.length <= 2_000)).toBe(true);
    expect(isIntakeSources([{ ...sources[0], id: "p2" }])).toBe(false);
    expect(() => createTextSources("x".repeat(40_001))).toThrow(
      "40,000 characters or fewer",
    );
  });
});
