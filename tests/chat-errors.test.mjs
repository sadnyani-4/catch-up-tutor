import assert from "node:assert/strict";
import { ApiError } from "@google/genai";
import { describe, it } from "vitest";
import {
  getChatErrorResponse,
  shouldTryChatFallback,
} from "../src/lib/chat-errors.ts";

describe("chat provider errors", () => {
  it("explains temporary provider overload", () => {
    const response = getChatErrorResponse(
      new ApiError({ status: 503, message: "UNAVAILABLE" }),
    );

    assert.equal(response.status, 503);
    assert.match(response.message, /temporarily busy/i);
  });

  it("tries the backup model for temporary provider failures", () => {
    assert.equal(
      shouldTryChatFallback(new ApiError({ status: 503, message: "UNAVAILABLE" })),
      true,
    );
    assert.equal(
      shouldTryChatFallback(new ApiError({ status: 504, message: "DEADLINE_EXCEEDED" })),
      true,
    );
    assert.equal(shouldTryChatFallback(new Error("Unexpected failure")), false);
  });

  it("explains request timeouts", () => {
    const response = getChatErrorResponse(
      new DOMException("Request timed out", "AbortError"),
    );

    assert.equal(response.status, 504);
    assert.match(response.message, /timed out/i);
  });

  it("explains SDK deadline errors", () => {
    const response = getChatErrorResponse(
      new ApiError({ status: 504, message: "DEADLINE_EXCEEDED" }),
    );

    assert.equal(response.status, 504);
    assert.match(response.message, /timed out/i);
  });

  it("keeps an explicit generic failure for unexpected errors", () => {
    const response = getChatErrorResponse(new Error("Unexpected failure"));

    assert.equal(response.status, 502);
    assert.match(response.message, /chat failed/i);
  });
});
