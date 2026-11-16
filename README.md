# IP Intake & Technical Brief Copilot

A portfolio project demonstrating a connected AI workflow built with Next.js, TypeScript, and Gemini. A selected invention disclosure—PDF, pasted text, or optional Notion import—powers both an evidence-linked intake draft and a technical briefing with study cards and source-grounded Q&A.

This is an AI-assisted workflow demo, not a fully autonomous agent, legal tool, or production multi-user service. The earlier general-purpose Catch-Up Tutor remains available at `/tutor` as a secondary demo.

The homepage (`/`) is the integrated IP copilot. Its **Intake review** and **Technical brief** tabs use the same selected source. A fictional example is available, but users can load their own non-confidential material.

## What this project demonstrates

- Connecting a web app to generative AI through server-side API routes.
- Turning the same source material into complementary outputs: a structured intake draft, a technical explanation, reviewer flashcards, and grounded Q&A.
- Validating structured model output and grounding intake claims in specific source passages.
- Streaming AI chat replies and handling provider timeouts with a backup model.
- Integrating with Notion while keeping its API token on the server.
- Preserving a human review step instead of treating model output as authoritative.

## Reviewer walkthrough

### Integrated IP copilot

1. Open `/` and load a text-based PDF, paste disclosure text, optionally import a Notion page, or choose **Try fictional sample**.
2. For user-provided material, confirm it is non-confidential and may be sent to Gemini. PDF text extraction itself happens locally; AI actions send the extracted source text to Gemini.
3. In **Intake review**, choose **Analyze disclosure** for live AI output. Check source links, edit the draft, answer reviewer questions, and export JSON. The prepared example is available only for the fictional sample.
4. Switch to **Technical brief** to generate an explanation, reviewer study cards, and source-grounded Q&A from that same disclosure.

### Secondary Catch-Up Tutor

Visit `/tutor` for the older lecture-study workflow, including a static sample session, PDF or optional Notion import, generated lessons and flashcards, audio playback, and tutor chat. Notion import/export is separate from the primary IP workflow.

## How the workflows work

### IP copilot: one disclosure to two review modes

```text
Fictional invention disclosure
        -> Intake review: structured draft + source-linked facts + human review/export
        -> Technical brief: grounded explanation + reviewer cards + streaming Q&A
```

The selected source is divided into labeled passages (`[p1]`, `[p2]`, etc.) used by both modes. The intake route validates structured output and resolves citations only to passages supplied for that run. The technical-brief routes ask the model to cite those labels, state when the disclosure is silent, and avoid legal conclusions. A person remains responsible for review.

- PDF extraction preserves page numbers and requires selectable text; scanned PDFs need an OCR transcript pasted as text.
- Pasted text and Notion content are divided into short passages for evidence linking. Source text is limited to 40,000 characters.
- The fictional battery-cooling example remains available for a no-upload walkthrough.

### Secondary tutor workflow

The separate `/tutor` route retains the earlier study workflow: PDF or Notion material is processed into lessons and flashcards, with streamed chat and optional audio or Notion export. This content is not the source for the IP copilot.

## Where to look in the code

| Area | Entry points |
| --- | --- |
| Integrated homepage and workflow tabs | [`src/app/page.tsx`](./src/app/page.tsx), [`src/app/intake/workspace.tsx`](./src/app/intake/workspace.tsx) |
| Source input and passage labeling | [`src/app/intake/workspace.tsx`](./src/app/intake/workspace.tsx), [`src/lib/intake-sources.ts`](./src/lib/intake-sources.ts), [`src/app/api/intake/parse-pdf/route.ts`](./src/app/api/intake/parse-pdf/route.ts) |
| Technical brief, flashcards, and grounded Q&A | [`src/app/intake/technical-brief.tsx`](./src/app/intake/technical-brief.tsx), [`src/app/api/teach-text/route.ts`](./src/app/api/teach-text/route.ts) |
| Secondary tutor interface and PDF processing | [`src/app/tutor/page.tsx`](./src/app/tutor/page.tsx), [`src/app/api/teach/route.ts`](./src/app/api/teach/route.ts) |
| Streaming tutor chat | [`src/app/api/chat/route.ts`](./src/app/api/chat/route.ts) |
| Optional Notion import/export | [`src/lib/notion.ts`](./src/lib/notion.ts), [`src/app/api/notion/`](./src/app/api/notion/) |
| Shared fictional disclosure | [`src/lib/intake-demo.ts`](./src/lib/intake-demo.ts) |
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

5. Open [http://localhost:3000](http://localhost:3000) for the IP copilot, or `/tutor` for the secondary study workflow.

## Configuration

### Gemini (live AI features)

```env
GEMINI_API_KEY=your_gemini_api_key
```

Required for live intake analysis, technical-brief generation, flashcards, grounded Q&A, and the secondary tutor's live features. **View prepared example** and PDF text extraction do not need a Gemini key.

### Notion import/export (optional)

```env
NOTION_API_KEY=your_internal_integration_secret
```

Create a Notion internal integration with **Read content** and (for tutor export) **Insert content** capabilities, add its secret to `.env.local`, and share each page you want to import from or save under with the integration. In the IP copilot or tutor, paste the page URL or ID:

- **IP copilot import** loads the page text as the shared disclosure source for both modes.
- **Tutor import** generates a study lesson and flashcards and makes that text available to tutor chat.
- **Save lesson + cards** remains available in the secondary tutor and creates a child page under the page you supplied.

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

- Do not upload or import confidential, personal, client, or patent-pending material. The demo is not approved for confidential case data.
- PDF text extraction runs locally, but the selected PDF-derived, pasted, or Notion text is sent to Google Gemini when an AI action runs. The UI requires a non-confidential-data confirmation for user-provided sources.
- The primary IP copilot does not save the selected source, draft, chat, or review state. Optional Supabase flashcard persistence may save generated cards when explicitly enabled.
- The secondary tutor can process user-provided PDFs or Notion text; those inputs are sent to Google Gemini for processing.
- AI output can be incomplete or wrong. Verify generated explanations, flashcards, and drafts against their sources.
- The intake prototype is not legal advice, a novelty search, or an assessment of patentability or infringement.
- The app is a single-user demo. Protect Gemini and Notion endpoints with authentication, authorization, and rate limits before exposing it publicly.

## Checks

```bash
npm run lint
npm test
npm run build
```
