import { ApiError } from "@google/genai";
import { describe, expect, it } from "vitest";
import { getGeminiErrorResponse } from "./gemini-errors";

describe("Gemini quota errors", () => {
  it("returns an actionable response for quota limits", () => {
    expect(
      getGeminiErrorResponse(
        new ApiError({ message: "Quota exceeded", status: 429 }),
      ),
    ).toEqual({
      status: 429,
      message:
        "Gemini's request quota is exhausted. Check the API key's quota or billing, or try again after the limit resets.",
    });
  });

  it("leaves other failures to the route-specific handler", () => {
    expect(
      getGeminiErrorResponse(
        new ApiError({ message: "Service unavailable", status: 503 }),
      ),
    ).toBeNull();
    expect(getGeminiErrorResponse(new Error("Unexpected failure"))).toBeNull();
  });

  it("classifies Gemini timeouts for a timely user-facing response", () => {
    const timeout = new Error("Request timed out");
    timeout.name = "TimeoutError";

    expect(getGeminiErrorResponse(timeout)).toEqual({
      status: 504,
      message: "The Gemini request timed out. Please try again.",
    });
  });
});
