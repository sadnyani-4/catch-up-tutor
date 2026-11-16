const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const errorForUnexpectedResponse = (status: number) => {
  if (status === 504) {
    return "The AI request timed out. Please try again.";
  }
  if (status >= 500) {
    return `The server could not complete the request (HTTP ${status}). Please try again.`;
  }
  return `The request returned an unexpected response (HTTP ${status}). Please try again.`;
};

export async function readApiResponse(
  response: Response,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  let payload: unknown;

  try {
    payload = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(errorForUnexpectedResponse(response.status));
    }
    throw new Error("The server returned an invalid response.");
  }

  if (!isRecord(payload)) {
    if (!response.ok) {
      throw new Error(errorForUnexpectedResponse(response.status));
    }
    throw new Error("The server returned an invalid response.");
  }

  return payload;
}
