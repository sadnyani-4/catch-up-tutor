import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { messages, documentText } = await req.json();

    const chat = ai.chats.create({
      model: 'gemini-3.8-flash',
      history: [
        {
          role: 'user',
          parts: [{ text: `Here is the reference lecture material for this course:\n\n${documentText.slice(0, 40000)}` }],
        },
        {
          role: 'model',
          parts: [{ text: "Understood! I've read the lecture materials. I'm ready to act as your personal tutor. Ask me any questions, request deeper explanations, or test your knowledge!" }],
        },
      ],
    });

    const latestMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage({ message: latestMessage });

    return NextResponse.json({ reply: result.text });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}