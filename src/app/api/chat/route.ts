import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getChatErrorResponse, shouldTryChatFallback } from '@/lib/chat-errors';

type ChatStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'token'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Tutor chat is not configured. Add GEMINI_API_KEY to the server environment.' },
        { status: 503 },
      );
    }

    const body: unknown = await req.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      !('messages' in body) ||
      !Array.isArray(body.messages) ||
      !('documentText' in body) ||
      typeof body.documentText !== 'string'
    ) {
      return NextResponse.json({ error: 'A lecture and chat message are required.' }, { status: 400 });
    }

    const messages = body.messages;
    const latestMessage = messages[messages.length - 1];
    if (
      typeof latestMessage !== 'object' ||
      latestMessage === null ||
      !('content' in latestMessage) ||
      typeof latestMessage.content !== 'string' ||
      !latestMessage.content.trim()
    ) {
      return NextResponse.json({ error: 'Enter a message before sending it.' }, { status: 400 });
    }
    if (latestMessage.content.length > 4000) {
      return NextResponse.json({ error: 'Messages must be 4,000 characters or fewer.' }, { status: 413 });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 15_000,
        retryOptions: {
          attempts: 1,
          initialDelay: 1,
          maxDelay: 2,
          jitter: 0,
        },
      },
    });

    const history = [
      {
        role: 'user' as const,
        parts: [{ text: `Here is the reference lecture material for this course:\n\n${body.documentText.slice(0, 40000)}` }],
      },
      {
        role: 'model' as const,
        parts: [{ text: "Understood! I've read the lecture materials. I'm ready to act as your personal tutor. Ask me any questions, request deeper explanations, or test your knowledge!" }],
      },
    ];

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: ChatStreamEvent) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };
        let hasEmittedText = false;

        try {
          send({ type: 'status', message: 'Tutor is thinking...' });
          const models = ['gemini-3.8-flash', 'gemini-3.6-flash'] as const;

          for (const [index, model] of models.entries()) {
            if (index > 0) {
              send({ type: 'status', message: 'The main model is busy; trying a backup...' });
            }

            try {
              const chat = ai.chats.create({ model, history });
              const responseStream = await chat.sendMessageStream({
                message: latestMessage.content,
              });

              for await (const chunk of responseStream) {
                if (!chunk.text) continue;
                hasEmittedText = true;
                send({ type: 'token', text: chunk.text });
              }

              if (!hasEmittedText) throw new Error('The tutor returned an empty response.');
              send({ type: 'done' });
              return;
            } catch (error) {
              if (index === 0 && !hasEmittedText && shouldTryChatFallback(error)) {
                console.warn('Primary Gemini chat model is unavailable; trying fallback model.');
                continue;
              }
              throw error;
            }
          }
        } catch (error) {
          console.error('Error in /api/chat stream:', error);
          const failure = getChatErrorResponse(error);
          send({ type: 'error', message: failure.message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    const failure = getChatErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}