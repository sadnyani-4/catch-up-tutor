import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { supabase } from '@/lib/supabase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { lectureText, courseTitle } = await req.json();

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an expert study assistant. Analyze this lecture material thoroughly (including all described diagrams, figures, and charts). 
      Extract 15-25 high-quality Q&A flashcards covering core concepts, mathematical definitions, AND key slide diagrams/visuals.

      CRITICAL LATEX RULES FOR FLASHCARDS:
      - Whenever writing ANY mathematical formula, variable, loss function, equation, subscript, superscript, or probability notation (e.g., L_MSE, argmax, P(x|y), sigma, prod, sum), ALWAYS enclose it in single dollar signs ($...$) for inline math or double dollar signs ($$...$$) for block equations.
      - Example: Write "$L_{\\text{Reward}} = \\log(\\sigma(r_j - r_k))$" instead of "L_Reward = log(sigma...)".
      - Example: Write "$P(l_1, \\dots, l_n)$" instead of "P(l_1, ..., l_n)".

      Lecture Material:
      ${lectureText.slice(0, 50000)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: 'string' },
              answer: { type: 'string' },
            },
            required: ['question', 'answer'],
          },
        },
      },
    });

    const flashcardsData = JSON.parse(response.text || '[]');

    const recordsToInsert = flashcardsData.map((fc: { question: string; answer: string }) => ({
      course_title: courseTitle || 'Missed Lecture',
      question: fc.question,
      answer: fc.answer,
      next_review_date: new Date().toISOString(),
      interval_days: 1,
    }));

    const { data, error } = await supabase.from('flashcards').insert(recordsToInsert).select();

    if (error) throw error;

    return NextResponse.json({ success: true, flashcards: data });
  } catch (error: any) {
    console.error('Error in /api/generate-flashcards:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}