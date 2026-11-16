import { PDFParse } from "pdf-parse";

export async function extractPdfPageText(data: Uint8Array) {
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return result.pages.map((page: { num: number; text: string }) => ({
      page: page.num,
      text: page.text.trim(),
    }));
  } finally {
    await parser.destroy();
  }
}
