import { describe, expect, it } from "vitest";
import { parseChatStreamEvent } from "./chat-stream";

describe("parseChatStreamEvent", () => {
  it("parses status and token events", () => {
    expect(parseChatStreamEvent('{"type":"status","message":"Working"}')).toEqual({
      type: "status",
      message: "Working",
    });
    expect(parseChatStreamEvent('{"type":"token","text":"Hello"}')).toEqual({
      type: "token",
      text: "Hello",
    });
  });

  it("parses terminal events", () => {
    expect(parseChatStreamEvent('{"type":"error","message":"Unavailable"}')).toEqual({
      type: "error",
      message: "Unavailable",
    });
    expect(parseChatStreamEvent('{"type":"done"}')).toEqual({ type: "done" });
  });

  it("rejects malformed or unsupported events", () => {
    expect(() => parseChatStreamEvent("{")).toThrow();
    expect(() => parseChatStreamEvent('{"type":"unknown"}')).toThrow(
      "The tutor returned an invalid response.",
    );
  });
});
