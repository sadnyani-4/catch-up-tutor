import { isFullPage } from '@notionhq/client';
import { NextResponse } from 'next/server';
import { createNotionClient, getNotionErrorResponse, getNotionPageId } from '@/lib/notion';

const MAX_LECTURE_TEXT_LENGTH = 40_000;

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (
    typeof body !== 'object' ||
    body === null ||
    !('pageUrlOrId' in body) ||
    typeof body.pageUrlOrId !== 'string' ||
    body.pageUrlOrId.length > 500
  ) {
    return NextResponse.json({ error: 'Enter a valid Notion page URL or ID.' }, { status: 400 });
  }

  const pageId = getNotionPageId(body.pageUrlOrId);
  if (!pageId) {
    return NextResponse.json({ error: 'Enter a valid Notion page URL or ID.' }, { status: 400 });
  }

  try {
    const notion = createNotionClient();
    const page = await notion.pages.retrieve({ page_id: pageId });
    if (!isFullPage(page)) {
      return NextResponse.json({ error: 'Notion did not return a readable page.' }, { status: 502 });
    }

    const titleProperty = Object.values(page.properties).find((property) => property.type === 'title');
    const title = titleProperty?.title.map((item) => item.plain_text).join('').trim() || 'Notion study page';
    const pageMarkdown = await notion.pages.retrieveMarkdown({ page_id: pageId });
    const lectureText = pageMarkdown.markdown.trim();
    if (!lectureText) {
      return NextResponse.json({ error: 'That Notion page has no readable text to study.' }, { status: 422 });
    }

    return NextResponse.json({
      pageId,
      title,
      lectureText: lectureText.slice(0, MAX_LECTURE_TEXT_LENGTH),
      truncated: pageMarkdown.truncated || lectureText.length > MAX_LECTURE_TEXT_LENGTH,
    });
  } catch (error) {
    console.error('Error in /api/notion/import:', error instanceof Error ? error.message : 'Unknown error');
    const failure = getNotionErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
