import { APIResponseError, Client, RequestTimeoutError, extractPageId } from '@notionhq/client';

export class NotionConfigurationError extends Error {
  constructor() {
    super('Add NOTION_API_KEY to the server environment to connect Notion.');
    this.name = 'NotionConfigurationError';
  }
}

export function createNotionClient() {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) throw new NotionConfigurationError();
  return new Client({ auth: apiKey });
}

export function getNotionPageId(pageUrlOrId: string) {
  return extractPageId(pageUrlOrId.trim());
}

export function getNotionErrorResponse(error: unknown) {
  if (error instanceof NotionConfigurationError) {
    return { status: 503, message: error.message };
  }

  if (error instanceof RequestTimeoutError) {
    return { status: 504, message: 'Notion took too long to respond. Please try again.' };
  }

  if (error instanceof APIResponseError) {
    if (error.status === 401) {
      return { status: 401, message: 'Notion rejected the integration token. Check NOTION_API_KEY.' };
    }
    if (error.status === 403 || error.status === 404) {
      return {
        status: 403,
        message: 'Notion could not access that page. Check the URL and share the page with your integration.',
      };
    }
    if (error.status === 429) {
      return { status: 429, message: 'Notion is receiving too many requests. Please try again shortly.' };
    }
  }

  return { status: 502, message: 'The Notion request failed. Check the page and integration permissions.' };
}
