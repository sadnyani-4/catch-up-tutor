import { ApiError } from "@google/genai";

export function getGeminiErrorResponse(error: unknown) {
  if (error instanceof ApiError && error.status === 429) {
    return {
      status: 429,
      message:
        "Gemini's request quota is exhausted. Check the API key's quota or billing, or try again after the limit resets.",
    };
  }

  if (
    (error instanceof ApiError && error.status === 504) ||
    (error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError"))
  ) {
    return {
      status: 504,
      message: "The Gemini request timed out. Please try again.",
    };
  }

  return null;
}
