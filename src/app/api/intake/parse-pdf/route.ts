import { NextResponse } from "next/server";
import { createPdfSources } from "@/lib/intake-sources";
import { extractPdfPageText } from "@/lib/pdf-text";

const MAX_PDF_SIZE = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a PDF disclosure." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        { error: "The PDF must be smaller than 15 MB and cannot be empty." },
        { status: 413 },
      );
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 415 });
    }

    const pages = await extractPdfPageText(new Uint8Array(await file.arrayBuffer()));
    const sources = createPdfSources(pages);
    if (sources.length === 0) {
      return NextResponse.json(
        { error: "No selectable text was found. Use a text-based PDF or paste an OCR transcript." },
        { status: 422 },
      );
    }

    return NextResponse.json({ title: file.name, sources });
  } catch (error) {
    console.error("Error extracting invention disclosure PDF:", error);
    if (error instanceof Error && error.message.includes("40,000-character limit")) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    return NextResponse.json(
      { error: "The PDF could not be read. Try another PDF or paste its text." },
      { status: 422 },
    );
  }
}
