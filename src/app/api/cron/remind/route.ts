import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });

export async function GET(request: Request) {
  const cronSecret = process.env.REMIND_CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Reminder endpoint is not configured.' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.MY_EMAIL;
  if (!resendApiKey || !recipient) {
    return NextResponse.json({ error: 'Reminder email is not configured.' }, { status: 503 });
  }

  try {
    // Get flashcards due on or before today
    const { data: dueCards, error } = await supabase
      .from('flashcards')
      .select('*')
      .lte('next_review_date', new Date().toISOString());

    if (error) throw error;

    if (dueCards && dueCards.length > 0) {
      const resend = new Resend(resendApiKey);
      const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const { error: sendError } = await resend.emails.send({
        from: 'AITutor <onboarding@resend.dev>',
        to: [recipient],
        subject: `📚 You have ${dueCards.length} Flashcards to Review Today!`,
        html: `
          <h2>Time to Study!</h2>
          <p>You have <strong>${dueCards.length}</strong> flashcards waiting for review.</p>
          <ul>
            ${dueCards.map((card) => `<li><strong>${escapeHtml(card.course_title)}:</strong> ${escapeHtml(card.question)}</li>`).join('')}
          </ul>
          <p><a href="${escapeHtml(siteUrl)}">Open AI Tutor to Review</a></p>
        `,
      });
      if (sendError) throw sendError;
      return NextResponse.json({ sent: true, count: dueCards.length });
    }

    return NextResponse.json({ sent: false, message: 'No cards due today.' });
  } catch (error) {
    console.error('Error sending flashcard reminder:', error);
    return NextResponse.json({ error: 'Could not send flashcard reminders.' }, { status: 502 });
  }
}