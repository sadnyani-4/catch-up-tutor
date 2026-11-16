export type ChatStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'token'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

export function parseChatStreamEvent(line: string): ChatStreamEvent {
  const value: unknown = JSON.parse(line);
  if (
    typeof value !== 'object' ||
    value === null ||
    !('type' in value) ||
    typeof value.type !== 'string'
  ) {
    throw new Error('The tutor returned an invalid response.');
  }

  if (value.type === 'status' && 'message' in value && typeof value.message === 'string') {
    return { type: 'status', message: value.message };
  }
  if (value.type === 'token' && 'text' in value && typeof value.text === 'string') {
    return { type: 'token', text: value.text };
  }
  if (value.type === 'error' && 'message' in value && typeof value.message === 'string') {
    return { type: 'error', message: value.message };
  }
  if (value.type === 'done') return { type: 'done' };

  throw new Error('The tutor returned an invalid response.');
}
