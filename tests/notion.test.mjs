import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { getNotionPageId } from "../src/lib/notion.ts";

describe("Notion page references", () => {
  it("accepts a page ID and returns its canonical UUID", () => {
    assert.equal(
      getNotionPageId("12345678123412341234123456789abc"),
      "12345678-1234-1234-1234-123456789abc",
    );
  });

  it("extracts a page ID from a Notion URL", () => {
    assert.equal(
      getNotionPageId("https://www.notion.so/workspace/Lecture-notes-12345678123412341234123456789abc"),
      "12345678-1234-1234-1234-123456789abc",
    );
  });

  it("rejects values that are not page references", () => {
    assert.equal(getNotionPageId("not a page"), null);
  });
});
