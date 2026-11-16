# Catch-Up Tutor + Invention Intake Copilot

Two small AI workflow demos built with Next.js, TypeScript, and Gemini:

- **Catch-Up Tutor** turns lecture PDFs into a study lesson and flashcards, with optional tutor chat and audio playback.
- The tutor can import text from a Notion page and save generated lessons and flashcards beneath a Notion page.
- **Invention Intake Copilot** demonstrates an evidence-first workflow on a fictional invention disclosure: extract a draft brief, link points to source passages, surface follow-up questions, and leave review and edits to a person.

The intake demo is an administrative workflow prototype, **not** legal advice, a novelty search, or an assessment of patentability or infringement.

## Try the demos

1. Install Node.js 22 or later.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and add the configuration you need.
4. Start the app:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). Choose **Try sample session** to explore the tutor without an upload, or open **Invention Intake Copilot** from the navigation.

The intake page displays its fictional source passages without credentials. **View prepared example** opens a clearly labelled, prewritten result without an API call. **Analyze sample** runs the live workflow through a server-side Gemini request and therefore needs `GEMINI_API_KEY`.

## Environment variables

Required only for AI-powered analysis and chat:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Optional flashcard persistence:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_ENABLE_FLASHCARD_PERSISTENCE=false
ENABLE_FLASHCARD_PERSISTENCE=false
```

Persistence is disabled by default. To enable it locally, set both persistence flags to `true`. This project has no sign-in or per-user access model; do not enable persistence for a public, multi-user deployment until authentication, ownership checks, and restrictive Supabase Row Level Security policies are in place. The browser Supabase key is public by design and is not an access-control mechanism.

Optional reminder-email configuration:

```env
RESEND_API_KEY=your_resend_api_key
MY_EMAIL=you@example.com
REMIND_CRON_SECRET=a-long-random-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The reminder endpoint requires `Authorization: Bearer <REMIND_CRON_SECRET>`. Configure your scheduler to send that header. Do not expose the secret in client-side code.

Optional Notion import/export:

```env
NOTION_API_KEY=your_internal_integration_secret
```

Create a Notion internal integration with read-content and insert-content capabilities, add its secret to `.env.local`, and share each page you want to import from or save under with that integration. The token is used only by server routes. Imported page text is sent to Google Gemini to generate a lesson and flashcards; do not use confidential or personal material.

## Privacy and demo limitations

- The tutor sends an uploaded PDF to Google Gemini for analysis. Do not upload confidential, personal, or client material.
- Notion page text is sent to Google Gemini for lesson and flashcard generation when imported.
- The intake demo sends only the built-in fictional sample to Gemini; it does not accept uploads and does not persist the draft or review state.
- AI output can be incomplete or wrong. Source links are restricted to passages in the sample, but reviewers must still verify the content.
- The Supabase library is a single-user prototype when persistence is explicitly enabled, not a secure shared library.
- Protect Gemini and Notion endpoints with authentication, authorization, and rate limits before exposing this single-user demo publicly.

## Checks

```bash
npm run lint
npm test
npm run build
```
