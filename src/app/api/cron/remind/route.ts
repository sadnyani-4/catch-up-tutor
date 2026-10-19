import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

// Lazy initialize Resend to prevent build-time crashes when environment variables are missing
const getResend = () => {
  return new Resend(process.env.RESEND_API_KEY || 're_placeholder');
};

export async function GET() {
  try {
    // Get flashcards due on or before today
    const { data: dueCards, error } = await supabase
      .from('flashcards')
      .select('*')
      .lte('next_review_date', new Date().toISOString());

    if (error) throw error;

    if (dueCards && dueCards.length > 0) {
      const resend = getResend();
      await resend.emails.send({
        from: 'AITutor <onboarding@resend.dev>',
        to: [process.env.MY_EMAIL || 'user@example.com'],
        subject: `📚 You have ${dueCards.length} Flashcards to Review Today!`,
        html: `
          <h2>Time to Study!</h2>
          <p>You have <strong>${dueCards.length}</strong> flashcards waiting for review.</p>
          <ul>
            ${dueCards.map((card) => `<li><strong>${card.course_title}:</strong>${card.question}</li>`).join('')}
          </ul>
          <p><a href="https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || 'localhost:3000'}">Open AI Tutor to Review</a></p>
        `,
      });
      return NextResponse.json({ sent: true, count: dueCards.length });
    }

    return NextResponse.json({ sent: false, message: 'No cards due today.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}