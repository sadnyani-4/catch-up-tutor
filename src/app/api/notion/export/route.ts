import { isFullPage } from '@notionhq/client';
import { NextResponse } from 'next/server';
import { createNotionClient, getNotionErrorResponse, getNotionPageId } from '@/lib/notion';

type ExportFlashcard = { question: string; answer: string };

const MAX_EXPORT_MARKDOWN_LENGTH = 100_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isExportFlashcard = (value: unknown): value is ExportFlashcard =>
  isRecord(value) &&
  typeof value.question === 'string' &&
  typeof value.answer === 'string' &&
  value.question.length <= 3000 &&
  value.answer.length <= 3000;

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (
    !isRecord(body) ||
    typeof body.pageUrlOrId !== 'string' ||
    body.pageUrlOrId.length > 500 ||
    typeof body.courseTitle !== 'string' ||
    body.courseTitle.trim().length === 0 ||
    body.courseTitle.length > 120 ||
    typeof body.lesson !== 'string' ||
    body.lesson.trim().length === 0 ||
    body.lesson.length > 40_000 ||
    !Array.isArray(body.flashcards) ||
    body.flashcards.length > 30 ||
    !body.flashcards.every(isExportFlashcard)
  ) {
    return NextResponse.json({ error: 'The lesson, flashcards, and a Notion parent page are required.' }, { status: 400 });
  }

  const parentPageId = getNotionPageId(body.pageUrlOrId);
  if (!parentPageId) {
    return NextResponse.json({ error: 'Enter a valid Notion parent page URL or ID.' }, { status: 400 });
  }

  const courseTitle = body.courseTitle.trim();
  const pageTitle = `Catch-Up Tutor — ${courseTitle}`.slice(0, 180);
  const cards = body.flashcards;
  const markdown = [
    '## Lesson',
    body.lesson.trim(),
    '## Flashcards',
    ...cards.flatMap((card, index) => [
      `### Card ${index + 1}`,
      `**Question:** ${card.question}`,
      `**Answer:** ${card.answer}`,
    ]),
    '_Created with Catch-Up Tutor._',
  ].join('\n\n');
  if (markdown.length > MAX_EXPORT_MARKDOWN_LENGTH) {
    return NextResponse.json(
      { error: 'This export is too large for one Notion page. Shorten the lesson or reduce the flashcards.' },
      { status: 413 },
    );
  }

  try {
    const notion = createNotionClient();
    const page = await notion.pages.create({
      parent: { type: 'page_id', page_id: parentPageId },
      properties: {
        title: {
          title: [{ type: 'text', text: { content: pageTitle } }],
        },
      },
      markdown,
      markdown_version: 'v2',
    });

    if (!isFullPage(page)) {
      return NextResponse.json({ error: 'Notion created the page but did not return its details.' }, { status: 502 });
    }

    return NextResponse.json({ url: page.url, title: pageTitle });
  } catch (error) {
    console.error('Error in /api/notion/export:', error instanceof Error ? error.message : 'Unknown error');
    const failure = getNotionErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
