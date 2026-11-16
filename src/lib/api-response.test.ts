import { describe, expect, it } from "vitest";
import { readApiResponse } from "./api-response";

describe("API response parsing", () => {
  it("parses JSON error responses", async () => {
    await expect(
      readApiResponse(
        Response.json({ error: "Quota exhausted." }, { status: 429 }),
      ),
    ).resolves.toEqual({ error: "Quota exhausted." });
  });

  it("handles non-JSON server timeouts without exposing the response body", async () => {
    await expect(
      readApiResponse(
        new Response("An error occurred", {
          status: 504,
          headers: { "Content-Type": "text/plain" },
        }),
      ),
    ).rejects.toThrow("The AI request timed out. Please try again.");
  });
});
