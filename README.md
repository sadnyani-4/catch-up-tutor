# Catch-Up Tutor + Invention Intake Copilot

A portfolio project demonstrating two practical, bounded AI workflows built with Next.js, TypeScript, and Gemini. It is designed to show how AI can support real work while keeping inputs, outputs, privacy, and human review visible.

This is an AI-assisted workflow demo, not a fully autonomous agent or a production multi-user service.

## What this project demonstrates

- Connecting a web app to generative AI through server-side API routes.
- Turning source material into useful outputs: lessons, flashcards, and a structured intake draft.
- Validating structured model output and grounding intake claims in specific source passages.
- Streaming tutor replies and handling provider timeouts with a backup model.
- Integrating with Notion while keeping its API token on the server.
- Preserving a human review step instead of treating model output as authoritative.

## Reviewer walkthrough

### Catch-Up Tutor

1. Choose **Try sample session** to see a preloaded lesson and flashcards without uploading a file or calling Gemini.
2. Open **Tutor Chat** and ask a question. This uses Gemini, so chat requires `GEMINI_API_KEY`.
3. To process your own material, upload a lecture PDF, or optionally import a Notion page. The tutor creates a lesson and flashcards, then lets you discuss the material and listen to the lesson.
4. To explore Notion export, configure the optional integration and save a lesson under a shared Notion page.

The sample lesson and cards are static demo content; the chat response is live AI output.

### Invention Intake Copilot

1. Open **Explore the invention-intake demo**.
2. Review the fictional source passages and choose **View prepared example** to inspect a prewritten draft without an API call.
3. Choose **Analyze sample** to run the live Gemini workflow.
4. Inspect the source links, edit the draft, answer reviewer questions, and export the result as JSON.

The sample describes a fictional battery-cooling invention. It is intentionally limited to administrative intake preparation—not legal analysis.

## How the workflows work

### Tutor: source material to study session

```text
PDF upload or Notion page
        -> server-side text/lesson processing with Gemini
        -> lesson and flashcards
        -> streamed tutor chat, audio playback, optional Notion export
```

- PDFs are sent to Gemini for analysis. Notion pages are read through a private Notion integration; their text is then sent to Gemini for lesson and flashcard generation.
- Tutor chat sends the current study material and conversation to Gemini. Replies stream to the page as they are generated. If the primary model is unavailable, the server tries a backup model and reports failures clearly.
- Flashcards stay in the current session by default. Optional Supabase persistence is available, but this prototype has no sign-in or per-user data isolation.

### Invention Intake: disclosure to reviewable draft

```text
Fictional disclosure passages
        -> Gemini returns a structured draft with source IDs
        -> server validates the draft and resolves IDs to source passages
        -> person reviews/edits the draft and exports JSON
```

- The model receives only the built-in fictional sample; this demo does not accept invention-disclosure uploads.
- The server checks the response shape and resolves citations from an allow-listed set of source IDs. The UI displays the original passages so a reviewer can verify each link.
- Follow-up questions surface missing details. A person remains responsible for review and any next steps.

## Where to look in the code

| Area | Entry points |
| --- | --- |
| Tutor interface and PDF processing | [`src/app/page.tsx`](./src/app/page.tsx), [`src/app/api/teach/route.ts`](./src/app/api/teach/route.ts) |
| Streaming tutor chat | [`src/app/api/chat/route.ts`](./src/app/api/chat/route.ts) |
| Notion import/export | [`src/lib/notion.ts`](./src/lib/notion.ts), [`src/app/api/notion/`](./src/app/api/notion/) |
| Intake interface and fictional sources | [`src/app/intake/workspace.tsx`](./src/app/intake/workspace.tsx), [`src/lib/intake-demo.ts`](./src/lib/intake-demo.ts) |
| Evidence-constrained intake analysis | [`src/app/api/intake/route.ts`](./src/app/api/intake/route.ts) |

## Run locally

1. Install Node.js 22 or later.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and add the keys for the features you want to try.
4. Start the app:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Configuration

### Gemini (live AI features)

```env
GEMINI_API_KEY=your_gemini_api_key
```

Required for live tutor chat, PDF/Notion lesson generation, flashcard generation, and **Analyze sample** in the intake demo. The preloaded tutor lesson/cards and **View prepared example** do not need a Gemini key.

### Notion import/export (optional)

```env
NOTION_API_KEY=your_internal_integration_secret
```

Create a Notion internal integration with **Read content** and **Insert content** capabilities, add its secret to `.env.local`, and share each page you want to import from or save under with the integration. In the app, paste the page URL or ID:

- **Import page** reads the page text, generates a study lesson and flashcards, and makes that text available to tutor chat.
- **Save lesson + cards** creates a new child page under the page you supplied.

The integration token is used only by server routes and is never sent to the browser. Notion is optional; the tutor's PDF and sample workflows do not require it.

### Supabase flashcard persistence (optional)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_ENABLE_FLASHCARD_PERSISTENCE=false
ENABLE_FLASHCARD_PERSISTENCE=false
```

Persistence is disabled by default. To enable it locally, set both persistence flags to `true`. This project has no sign-in or per-user access model; do not enable persistence for a public, multi-user deployment until authentication, ownership checks, and restrictive Supabase Row Level Security policies are in place. The browser Supabase key is public by design and is not an access-control mechanism.

### Reminder emails (optional)

```env
RESEND_API_KEY=your_resend_api_key
MY_EMAIL=you@example.com
REMIND_CRON_SECRET=a-long-random-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The reminder endpoint requires `Authorization: Bearer <REMIND_CRON_SECRET>`. Configure your scheduler to send that header. Do not expose the secret in client-side code.

## Privacy and limitations

- Do not upload or import confidential, personal, or client material. PDF and Notion text is sent to Google Gemini for processing.
- The intake demo uses only fictional, built-in text and does not persist its draft or review state.
- AI output can be incomplete or wrong. Verify generated explanations, flashcards, and drafts against their sources.
- The intake prototype is not legal advice, a novelty search, or an assessment of patentability or infringement.
- The app is a single-user demo. Protect Gemini and Notion endpoints with authentication, authorization, and rate limits before exposing it publicly.

## Checks

```bash
npm run lint
npm test
npm run build
```
