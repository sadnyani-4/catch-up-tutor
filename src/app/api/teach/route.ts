import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to base64 inline data for Gemini
    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString('base64');

    const prompt = `
  You are an expert university professor teaching a student who missed the first lecture.
  Analyze BOTH the text AND all images, figures, charts, architectural diagrams, and slides in the attached PDF.

  CRITICAL VISUAL ANALYSIS INSTRUCTIONS:
  - Identify every key diagram or figure in the slides that is important for exams (e.g., Venn diagrams, model architectures, decision trees, workflow graphs).
  - Explicitly break down what each visual shows so the student doesn't miss exam questions based on slide graphics.

  CRITICAL FORMATTING INSTRUCTIONS FOR MATHEMATICAL NOTATION:
  - When writing mathematical formulas, symbols, variables, vector notation, or formal equations, ALWAYS use standard LaTeX formatting.
  - Use single dollar signs ($...$) for inline math expressions (e.g., $f(x) = w^T x + b$).
  - Use double dollar signs ($$...$$) for standalone block equations on their own lines.

  STRUCTURE YOUR EXPLANATION USING GITHUB-FLAVORED MARKDOWN:

  # 🎯 Lecture at a Glance
  - High-level overview of what was covered and why it matters.

  ---

  ## 🖼️ Important Diagrams & Visual Concepts
  For every critical diagram/figure in the slides:
  - **Figure Name**: (e.g., "AI vs ML vs DL Venn Diagram")
  - **Visual Representation**: Always wrap ASCII art or structural diagrams inside a markdown code block (\`\`\`text ... \`\`\`) so it renders nicely in a box.
  - **Exam Takeaway**: Core concept to remember.

  ---

  ## 💡 Core Concepts & Intuition
  Break down key topics using clear subheadings (###):
  - **Concept Name**: Direct, clear explanation.
  - **Analogy**: Relatable comparison.

  ---

  ## 📐 Key Formulas (Step-by-Step)
  For every equation, follow this exact format:
  1. **What it does**: 1 sentence explanation in plain English.
  2. **The Formula**:
     $$ [Equation Here] $$
  3. **Variable Breakdown**:
     - Bullet points explaining each symbol.

  ---

  ## 📌 Must-Know Exam Takeaways
  > 💡 **Key Concept**: Essential takeaways to memorize.
`;

    // Pass the PDF directly to Gemini 3.8 Flash
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data,
          },
        },
        prompt,
      ],
    });

    return NextResponse.json({
      explanation: response.text,
      extractedText: response.text,
    });
  } catch (error: any) {
    console.error('Error in /api/teach:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}