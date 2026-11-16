import { ApiError } from "@google/genai";

export function shouldTryChatFallback(error: unknown) {
  return (
    (error instanceof ApiError && (error.status === 503 || error.status === 504)) ||
    (error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError"))
  );
}

export function getChatErrorResponse(error: unknown) {
  if (error instanceof ApiError && error.status === 503) {
    return {
      status: 503,
      message: "The AI tutor is temporarily busy. Please try again shortly.",
    };
  }

  if (
    (error instanceof ApiError && error.status === 504) ||
    (error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError"))
  ) {
    return {
      status: 504,
      message: "The tutor request timed out. Please try again.",
    };
  }

  return {
    status: 502,
    message: "Tutor chat failed. Please try again shortly.",
  };
}
