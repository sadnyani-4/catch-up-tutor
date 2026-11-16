'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { supabase } from '@/lib/supabase';
import { Upload, BookOpen, Layers, Send, RefreshCw, MessageSquare, VolumeX, Pause, Play, Sparkles, Database, FileText } from 'lucide-react';
import { sampleFlashcards, sampleLesson } from '@/lib/intake-demo';

type SavedFlashcard = {
  id: string;
  course_title: string;
  question: string;
  answer: string;
  next_review_date: string;
};

type ChatStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'token'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

function parseChatStreamEvent(line: string): ChatStreamEvent {
  const value: unknown = JSON.parse(line);
  if (
    typeof value !== 'object' ||
    value === null ||
    !('type' in value) ||
    typeof value.type !== 'string'
  ) {
    throw new Error('The tutor returned an invalid response.');
  }

  if (value.type === 'status' && 'message' in value && typeof value.message === 'string') {
    return { type: 'status', message: value.message };
  }
  if (value.type === 'token' && 'text' in value && typeof value.text === 'string') {
    return { type: 'token', text: value.text };
  }
  if (value.type === 'error' && 'message' in value && typeof value.message === 'string') {
    return { type: 'error', message: value.message };
  }
  if (value.type === 'done') return { type: 'done' };

  throw new Error('The tutor returned an invalid response.');
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [notionPageUrl, setNotionPageUrl] = useState('');
  const [notionNotice, setNotionNotice] = useState('');
  const [notionExportUrl, setNotionExportUrl] = useState('');
  const [notionSaving, setNotionSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [flashcardNotice, setFlashcardNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [explanation, setExplanation] = useState('');
  const [rawText, setRawText] = useState('');
  const [flashcards, setFlashcards] = useState<{
    id?: string;
    course_title?: string;
    question: string;
    answer: string;
    next_review_date?: string;
  }[]>([]);
  const [activeTab, setActiveTab] = useState<'lesson' | 'flashcards' | 'chat' | 'saved-library'>('lesson');
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);
  const [isSampleSession, setIsSampleSession] = useState(false);

  // Supabase Library State
  const [savedFlashcards, setSavedFlashcards] = useState<SavedFlashcard[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Audio Speech States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Chat States
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatStatus, setChatStatus] = useState('Tutor is thinking...');
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_ENABLE_FLASHCARD_PERSISTENCE === 'true' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  // Stop speech when leaving or generating new lesson
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, [explanation]);

  // Fetch flashcards directly from Supabase
  const fetchSavedFlashcards = async () => {
    setLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedFlashcards(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setErrorMessage('Could not load the saved library: ' + message);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleSpeakToggle = () => {
    if (!('speechSynthesis' in window)) {
      return alert('Text-to-speech is not supported in your browser.');
    }

    const synth = window.speechSynthesis;

    if (isSpeaking && !isPaused) {
      synth.pause();
      setIsPaused(true);
      return;
    }

    if (isSpeaking && isPaused) {
      synth.resume();
      setIsPaused(false);
      return;
    }

    // Start speaking clean text (strip markdown symbols for better audio flow)
    synth.cancel();
    const cleanText = explanation.replace(/[#*`_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    synth.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const handleStopSpeech = () => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!file) {
      setErrorMessage('Choose a lecture PDF before starting the upload.');
      return;
    }
    setErrorMessage('');
    setFlashcardNotice('');
    setLoading(true);
    setStatus('Analyzing document structure & visuals with Gemini 3.8 Flash...');

    try {
      handleStopSpeech();
      const formData = new FormData();
      formData.append('file', file);

      const teachRes = await fetch('/api/teach', { method: 'POST', body: formData });
      const teachData = await teachRes.json();

      if (!teachRes.ok || teachData.error) throw new Error(teachData.error || 'Could not analyze the PDF.');
      if (typeof teachData.explanation !== 'string' || !teachData.explanation) {
        throw new Error('The analysis did not include a lesson. Please try another PDF.');
      }
      setExplanation(teachData.explanation);
      setRawText(teachData.extractedText || teachData.explanation);

      setStatus('Building comprehensive flashcard deck...');
      const fcRes = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureText: teachData.extractedText || teachData.explanation,
          courseTitle: courseTitle || 'Missed Lecture',
        }),
      });

      const fcData = await fcRes.json();
      if (!fcRes.ok || fcData.error) throw new Error(fcData.error || 'Could not generate flashcards.');
      setFlashcards(fcData.flashcards);

      setStatus(fcData.persisted ? 'Ready!' : 'Ready! Cards are session-only.');
      setFlashcardNotice(
        fcData.persisted
          ? 'Flashcards were saved to your configured library.'
          : 'Flashcards are available in this session only; library persistence is disabled.',
      );
      setIsSampleSession(false);
      setChatMessages([]);
      setActiveTab('lesson');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong while processing the PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromNotion = async () => {
    if (!notionPageUrl.trim()) {
      setErrorMessage('Paste a Notion page URL or ID before importing.');
      return;
    }

    setErrorMessage('');
    setFlashcardNotice('');
    setNotionNotice('');
    setNotionExportUrl('');
    setLoading(true);
    setStatus('Importing Notion page...');

    try {
      handleStopSpeech();
      const importRes = await fetch('/api/notion/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageUrlOrId: notionPageUrl }),
      });
      const importData = await importRes.json();
      if (!importRes.ok || importData.error) {
        throw new Error(importData.error || 'Could not import the Notion page.');
      }
      if (typeof importData.lectureText !== 'string' || !importData.lectureText.trim()) {
        throw new Error('The Notion page did not include readable study material.');
      }

      const importedCourseTitle = courseTitle.trim() || importData.title || 'Notion study page';
      setCourseTitle(importedCourseTitle);
      setStatus('Building a lesson from your Notion page...');
      const teachRes = await fetch('/api/teach-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureText: importData.lectureText }),
      });
      const teachData = await teachRes.json();
      if (!teachRes.ok || teachData.error) {
        throw new Error(teachData.error || 'Could not build a lesson from the Notion page.');
      }
      if (typeof teachData.explanation !== 'string' || !teachData.explanation) {
        throw new Error('The AI did not return a lesson. Please try again.');
      }

      setExplanation(teachData.explanation);
      setRawText(importData.lectureText);
      setStatus('Building flashcards...');
      const flashcardsRes = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureText: importData.lectureText,
          courseTitle: importedCourseTitle,
        }),
      });
      const flashcardsData = await flashcardsRes.json();
      if (!flashcardsRes.ok || flashcardsData.error) {
        throw new Error(flashcardsData.error || 'Could not generate flashcards.');
      }

      setFile(null);
      setFlashcards(flashcardsData.flashcards);
      setFlashcardNotice(
        flashcardsData.persisted
          ? 'Flashcards were saved to your configured library.'
          : 'Flashcards are available in this session only; library persistence is disabled.',
      );
      setNotionNotice(
        `Imported "${importedCourseTitle}" from Notion${importData.truncated ? ' (limited to 40,000 characters).' : '.'}`,
      );
      setIsSampleSession(false);
      setChatMessages([]);
      setActiveTab('lesson');
      setStatus('Ready!');
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not import the Notion page.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToNotion = async () => {
    if (!explanation || !notionPageUrl.trim()) {
      setErrorMessage('Add a Notion parent page and create a lesson before saving.');
      return;
    }

    setErrorMessage('');
    setNotionNotice('');
    setNotionExportUrl('');
    setNotionSaving(true);
    try {
      const response = await fetch('/api/notion/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageUrlOrId: notionPageUrl,
          courseTitle: courseTitle || 'Catch-Up Tutor lesson',
          lesson: explanation,
          flashcards: flashcards.map(({ question, answer }) => ({ question, answer })),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Could not save the lesson to Notion.');
      }
      if (typeof data.url !== 'string') {
        throw new Error('Notion created the page but did not return a link.');
      }

      setNotionNotice('Lesson and flashcards saved as a new Notion page.');
      setNotionExportUrl(data.url);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save the lesson to Notion.');
    } finally {
      setNotionSaving(false);
    }
  };

  const handleTrySample = () => {
    handleStopSpeech();
    setErrorMessage('');
    setFlashcardNotice('Sample flashcards are preloaded locally and are not saved.');
    setCourseTitle('Engineering systems (sample)');
    setFile(null);
    setExplanation(sampleLesson);
    setRawText(sampleLesson);
    setFlashcards(sampleFlashcards);
    setFlippedIndex(null);
    setChatMessages([]);
    setIsSampleSession(true);
    setActiveTab('lesson');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading) return;

    setChatError('');
    setChatStatus('Tutor is thinking...');
    const newMessages = [...chatMessages, { role: 'user', content: inputMessage }];
    setChatMessages(newMessages);
    setInputMessage('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, documentText: rawText }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'The tutor could not answer.');
      }
      if (!res.body) throw new Error('The tutor response stream is unavailable.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let reply = '';
      let completed = false;
      let streamError: string | undefined;

      const processLine = (line: string) => {
        if (!line.trim()) return;
        const event = parseChatStreamEvent(line);
        if (event.type === 'status') setChatStatus(event.message);
        if (event.type === 'token') {
          reply += event.text;
          setChatMessages([...newMessages, { role: 'model', content: reply }]);
          setChatStatus('Tutor is replying...');
        }
        if (event.type === 'error') streamError = event.message;
        if (event.type === 'done') completed = true;
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          lines.forEach(processLine);

          if (done) {
            processLine(buffer);
            break;
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (streamError) throw new Error(streamError);
      if (!completed || !reply.trim()) throw new Error('The tutor response ended unexpectedly.');
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : 'The tutor could not answer. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main className="study-page min-h-screen p-6 md:p-12">
      <div className="study-shell max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="study-header flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <div className="study-eyebrow flex items-center gap-2 text-blue-400 font-semibold text-sm uppercase tracking-wider">
              <Sparkles className="h-4 w-4" /> AI Zero-Backlog Engine
            </div>
            <h1 className="study-title text-3xl font-extrabold tracking-tight mt-1 text-white">Catch-Up Tutor</h1>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="text-slate-400 text-sm max-w-xs md:text-right">
              Turn lecture PDFs or Notion pages into guided lessons, interactive chat, and smart flashcards.
            </p>
            <Link
              href="/intake"
              className="study-intake-link inline-flex items-center gap-2 rounded-lg border border-indigo-400/40 bg-indigo-400/10 px-3 py-2 text-sm font-medium text-indigo-200 transition hover:bg-indigo-400/20"
            >
              <FileText className="h-4 w-4" /> Explore the invention-intake demo
            </Link>
          </div>
        </header>

        {/* Upload Card */}
        <div className="study-upload-panel bg-slate-800/60 backdrop-blur border border-slate-700/60 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Course Name</label>
              <input
                type="text"
                placeholder="e.g., Foundations of AI and Data Science"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Lecture PDF</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-300 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500 text-sm cursor-pointer"
              />
              <p className="mt-2 text-xs leading-5 text-amber-200/80">
                Uploaded PDFs are sent to Google Gemini for analysis. Do not upload confidential or personal material.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={handleUploadAndProcess}
              disabled={loading || notionSaving}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3.5 rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <Upload className="h-5 w-5" />}
              {loading ? status : 'Process PDF'}
            </button>
            <button
              type="button"
              onClick={handleTrySample}
              disabled={loading || notionSaving}
              className="w-full border border-slate-600 bg-slate-700/60 hover:bg-slate-700 text-slate-100 font-medium py-3.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="h-5 w-5 text-blue-300" />
              Try sample session
            </button>
          </div>
          <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Database className="h-4 w-4 text-blue-300" /> Notion study workspace
            </div>
            <p className="text-xs leading-5 text-slate-400">
              You can import a shared Notion page as lecture material, or save this lesson and its flashcards under that page.
              Imported text is sent to Google Gemini; do not use confidential or personal material.
            </p>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input
                type="text"
                aria-label="Notion page URL or ID"
                placeholder="Paste a Notion page URL or ID"
                value={notionPageUrl}
                onChange={(event) => {
                  setNotionPageUrl(event.target.value);
                  setNotionNotice('');
                  setNotionExportUrl('');
                }}
                className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleImportFromNotion}
                disabled={loading || notionSaving || !notionPageUrl.trim()}
                className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? status : 'Import page'}
              </button>
              <button
                type="button"
                onClick={handleSaveToNotion}
                disabled={loading || notionSaving || !explanation || !notionPageUrl.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {notionSaving ? 'Saving...' : 'Save lesson + cards'}
              </button>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Requires <code>NOTION_API_KEY</code> on the server and access granted to the integration for this page.
            </p>
            {notionNotice && (
              <p className="text-xs text-emerald-200" role="status" aria-live="polite">
                {notionNotice}
              </p>
            )}
            {notionExportUrl && (
              <a
                href={notionExportUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm font-medium text-blue-300 underline underline-offset-4 hover:text-blue-200"
              >
                Open saved Notion page
              </a>
            )}
          </div>
          {errorMessage && (
            <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              {errorMessage}
            </p>
          )}
          {isSampleSession && (
            <p className="text-xs text-slate-400" role="status">
              Sample lesson and flashcards are preloaded locally. Tutor chat still uses the configured Gemini API.
            </p>
          )}
          {flashcardNotice && !isSampleSession && (
            <p className="text-xs text-slate-400" role="status" aria-live="polite">
              {flashcardNotice}
            </p>
          )}
        </div>

        {/* Content Section */}
        <div className="space-y-6">
          
          {/* Navigation Tabs Bar */}
          <div className="study-tabs flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
            <div className="flex gap-2 flex-wrap">
              {explanation && (
                <>
                  <button
                    onClick={() => setActiveTab('lesson')}
                    className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition ${
                      activeTab === 'lesson' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <BookOpen className="h-4 w-4" /> Lesson & Audio
                  </button>
                  <button
                    onClick={() => setActiveTab('flashcards')}
                    className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition ${
                      activeTab === 'flashcards' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Layers className="h-4 w-4" /> Current Cards ({flashcards.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition ${
                      activeTab === 'chat' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" /> Tutor Chat
                  </button>
                </>
              )}

              {/* Always accessible database library button */}
              {hasSupabase && <button
                onClick={() => {
                  setActiveTab('saved-library');
                  fetchSavedFlashcards();
                }}
                className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition ${
                  activeTab === 'saved-library' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Database className="h-4 w-4" /> Supabase Library ({savedFlashcards.length})
              </button>}
            </div>

            {/* Audio Controls Bar */}
            {activeTab === 'lesson' && explanation && (
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
                <span className="text-xs text-slate-300 font-medium mr-1">Listen to Lesson:</span>
                <button
                  onClick={handleSpeakToggle}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition flex items-center gap-1 text-xs font-medium cursor-pointer"
                >
                  {isSpeaking && !isPaused ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {isSpeaking && !isPaused ? 'Pause' : isSpeaking && isPaused ? 'Resume' : 'Play Audio'}
                </button>
                {isSpeaking && (
                  <button
                    onClick={handleStopSpeech}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2 rounded-lg transition text-xs cursor-pointer"
                  >
                    <VolumeX className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Lesson Tab (With Fixed Typography & Code Block Wrapping) */}
          {activeTab === 'lesson' && explanation && (
            <div className="bg-slate-800/80 border border-slate-700/80 p-8 md:p-12 rounded-2xl shadow-xl prose prose-invert prose-slate max-w-none 
              prose-headings:text-blue-400 prose-headings:font-bold prose-headings:tracking-tight 
              prose-h1:text-2xl prose-h1:border-b prose-h1:border-slate-700 prose-h1:pb-3
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-slate-100
              prose-h3:text-lg prose-h3:text-blue-300
              prose-p:text-slate-300 prose-p:leading-relaxed prose-p:my-3
              prose-strong:text-white prose-strong:font-semibold
              prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
              prose-li:text-slate-300 prose-li:my-1
              prose-hr:border-slate-700 prose-hr:my-8
              prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-700 prose-pre:rounded-xl prose-pre:overflow-x-auto
              prose-code:bg-slate-900 prose-code:text-blue-300 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown 
                remarkPlugins={[remarkMath]} 
                rehypePlugins={[rehypeKatex]}
              >
                {explanation}
              </ReactMarkdown>
            </div>
          )}

          {/* Current Flashcards Tab */}
          {activeTab === 'flashcards' && explanation && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flashcards.map((card, idx) => (
                <div
                  key={card.id || idx}
                  onClick={() => setFlippedIndex(flippedIndex === idx ? null : idx)}
                  className="cursor-pointer bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-lg hover:border-blue-500 transition min-h-[180px] flex flex-col justify-between group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                      Card {idx + 1} • {flippedIndex === idx ? 'Answer' : 'Question'}
                    </span>
                    <span className="text-xs text-slate-500 group-hover:text-slate-300 transition">Click to flip 🔄</span>
                  </div>
                  
                  <div className="text-base font-medium text-slate-200 my-4 markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {flippedIndex === idx ? card.answer : card.question}
                    </ReactMarkdown>
                  </div>

                  <div className="text-xs text-slate-500 text-right">
                    {flippedIndex === idx ? 'Showing Answer' : 'Showing Question'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && explanation && (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl shadow-xl flex flex-col h-[520px] p-4">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {chatMessages.length === 0 && (
                  <div className="text-center text-slate-500 my-32">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">Your AI personal tutor is ready.</p>
                    <p className="text-xs text-slate-600 mt-1">Ask questions about formulas, diagrams, or request practice problems.</p>
                  </div>
                )}
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-slate-700 text-slate-200 rounded-bl-none prose prose-invert'
                      }`}
                    >
                      <ReactMarkdown 
                        remarkPlugins={[remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="text-slate-400 text-xs italic flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin" /> {chatStatus}
                  </div>
                )}
                {chatError && (
                  <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
                    {chatError}
                  </p>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 border-t border-slate-700 pt-4">
                <input
                  type="text"
                  placeholder="Ask a follow-up question or test me on this lecture..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-medium transition disabled:opacity-50 flex items-center justify-center cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {/* Database Library Tab (Supabase) */}
          {activeTab === 'saved-library' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-400" /> Saved Flashcards in Supabase
                </h2>
                <button
                  onClick={fetchSavedFlashcards}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition"
                >
                  {loadingSaved ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>

              {savedFlashcards.length === 0 ? (
                <div className="text-center text-slate-500 py-16 bg-slate-800/40 rounded-2xl border border-slate-800">
                  <p>No flashcards found in your database yet. Upload a PDF to generate some!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedFlashcards.map((card, idx) => (
                    <div
                      key={card.id || idx}
                      className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl shadow-lg flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                            {card.course_title}
                          </span>
                          <span className="text-xs text-slate-500">
                            Due: {new Date(card.next_review_date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="text-sm font-semibold text-white mb-2 markdown-content">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {`Q: ${card.question}`}
                          </ReactMarkdown>
                        </div>

                        <div className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-xl border border-slate-800 markdown-content">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {`A: ${card.answer}`}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}