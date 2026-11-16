export const MAX_INTAKE_SOURCE_LENGTH = 40_000;

const MAX_PASSAGE_LENGTH = 2_000;

export type IntakeSource = {
  id: string;
  heading: string;
  text: string;
  page?: number;
};

type PdfPageText = { page: number; text: string };

function splitIntoPassages(text: string): string[] {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const passages: string[] = [];
  let current = "";

  const addChunk = (chunk: string) => {
    const next = current ? `${current}\n\n${chunk}` : chunk;
    if (next.length <= MAX_PASSAGE_LENGTH) {
      current = next;
    } else {
      if (current) passages.push(current);
      current = chunk;
    }
  };

  for (const paragraph of paragraphs) {
    let remaining = paragraph;
    while (remaining.length > MAX_PASSAGE_LENGTH) {
      let end = remaining.lastIndexOf(" ", MAX_PASSAGE_LENGTH);
      if (end < 1) end = MAX_PASSAGE_LENGTH;
      addChunk(remaining.slice(0, end).trim());
      remaining = remaining.slice(end).trim();
    }
    if (remaining) addChunk(remaining);
  }

  if (current) passages.push(current);
  return passages;
}

function createSources(
  chunks: Array<{ text: string; heading: string; page?: number }>,
): IntakeSource[] {
  return chunks.map((chunk, index) => ({
    id: `p${index + 1}`,
    heading: chunk.heading,
    text: chunk.text,
    ...(chunk.page === undefined ? {} : { page: chunk.page }),
  }));
}

export function createTextSources(text: string): IntakeSource[] {
  const normalized = text.trim();
  if (normalized.length > MAX_INTAKE_SOURCE_LENGTH) {
    throw new Error("Source text must be 40,000 characters or fewer.");
  }
  return createSources(
    splitIntoPassages(normalized).map((passage, index) => ({
      text: passage,
      heading: `Text passage ${index + 1}`,
    })),
  );
}

export function createPdfSources(pages: PdfPageText[]): IntakeSource[] {
  const totalLength = pages.reduce((total, page) => total + page.text.length, 0);
  if (totalLength > MAX_INTAKE_SOURCE_LENGTH) {
    throw new Error("Extracted PDF text exceeds the 40,000-character limit.");
  }

  return createSources(
    pages.flatMap((page) =>
      splitIntoPassages(page.text).map((passage) => ({
        text: passage,
        heading: "PDF passage",
        page: page.page,
      })),
    ),
  );
}

export function formatIntakeSources(sources: readonly IntakeSource[]): string {
  return sources
    .map((source) => {
      const location = source.page === undefined
        ? source.heading
        : `Page ${source.page} · ${source.heading}`;
      return `[${source.id}] ${location}\n${source.text}`;
    })
    .join("\n\n");
}

export function isIntakeSources(value: unknown): value is IntakeSource[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) return false;

  let totalLength = 0;
  const isValid = value.every((source, index) => {
    if (typeof source !== "object" || source === null) return false;

    const item = source as Record<string, unknown>;
    if (
      item.id !== `p${index + 1}` ||
      typeof item.heading !== "string" ||
      !item.heading.trim() ||
      item.heading.length > 120 ||
      typeof item.text !== "string" ||
      !item.text.trim() ||
      item.text.length > MAX_PASSAGE_LENGTH ||
      ("page" in item &&
        (typeof item.page !== "number" ||
          !Number.isInteger(item.page) ||
          item.page < 1))
    ) {
      return false;
    }

    totalLength += item.text.length;
    return totalLength <= MAX_INTAKE_SOURCE_LENGTH;
  });

  return isValid;
}
