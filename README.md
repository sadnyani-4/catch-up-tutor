# 🚀 Catch-Up Tutor (AI Zero-Backlog Engine)

An immersive, AI-powered study platform designed to help students bridge learning gaps and conquer lecture backlogs. Simply upload a dense lecture PDF, and the engine instantly transforms it into structured interactive lessons, text-to-speech audio playback, typeset LaTeX math equations, diagram breakdowns, automated spaced-repetition flashcards stored in Supabase, and an interactive AI tutor chat.

---

## ✨ Core Features

- **📄 Smart PDF Parsing & Structuring:** Analyzes document text and slide diagrams to reconstruct clear, high-yield lecture summaries using Google Gemini.
- **🔊 Immersive Audio Lessons:** Built-in text-to-speech player with Play, Pause, Resume, and Stop controls so you can listen to your lessons on the go.
- **📐 Deep Math & Diagram Rendering:** Full KaTeX math support for complex inline and block equations ($L_{\text{Reward}} = \log(\sigma(r_j - r_k)$), alongside clean ASCII diagram boxes.
- **🗂️ Smart Flashcard Generator:** Automatically extracts 15–25 high-yield Q&A flashcards covering core concepts, formulas, and visual figures.
- **🗄️ Supabase PostgreSQL Persistence:** Seamlessly syncs and stores generated flashcards so you can review your saved library anytime.
- **💬 Interactive Tutor Chat:** Ask follow-up questions, request practice problems, or clarify difficult formulas with a context-aware AI tutor.
- **📧 Daily Review Reminders:** Automated email notifications via Resend and cron-job integration to keep your study streak alive.

---

## 🧰 Tech Stack

- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS, Tailwind Typography (`@tailwindcss/typography`)
- **AI Engine:** Google Gemini API (`gemini-3.8-flash`)
- **Database & Backend:** Supabase (PostgreSQL)
- **Email Service:** Resend API
- **Markdown & Math Libraries:** `react-markdown`, `remark-math`, `rehype-katex`, `katex`
- **Icons:** `lucide-react`

---

## 🛠️ Getting Started Locally

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18+) installed on your machine.

### 2. Clone the Repository
```bash
git clone [https://github.com/YOUR_USERNAME/catch-up-tutor.git](https://github.com/YOUR_USERNAME/catch-up-tutor.git)
cd catch-up-tutor
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a .env.local file in the root directory and add your API keys and database credentials:

```
GEMINI_API_KEY=your_google_gemini_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
RESEND_API_KEY=your_resend_api_key_here
REMIND_CRON_SECRET=your_secure_cron_secret_here
```

### 5. Set up Supabase Database
Run the following SQL snippet in your Supabase SQL Editor to create the required flashcards table:

```SQL
create table flashcards (
  id uuid default gen_random_uuid() primary key,
  course_title text not null,
  question text not null,
  answer text not null,
  next_review_date timestamp with time zone default timezone('utc'::text, now()) not null,
  interval_days integer default 1 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### 6. Run the Development Server
```Bash
npm run dev
```
Open http://localhost:3000 in your browser to test the application!

# 📦 Deployment on Vercel
The easiest way to host your app for free is using Vercel:
1. Push your repository to GitHub.
2. Import the project into Vercel.
3. Add your environment variables (GEMINI_API_KEY, Supabase keys, etc.) in the Vercel project settings.
4. Click Deploy!

# Link
https://catch-up-tutor-itwr.vercel.app/