'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { supabase } from '@/lib/supabase';
import { Upload, BookOpen, Layers, Send, RefreshCw, MessageSquare, VolumeX, Pause, Play, Sparkles, Database } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [explanation, setExplanation] = useState('');
  const [rawText, setRawText] = useState('');
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'lesson' | 'flashcards' | 'chat' | 'saved-library'>('lesson');
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);

  // Supabase Library State
  const [savedFlashcards, setSavedFlashcards] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Audio Speech States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Chat States
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

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
    } catch (err: any) {
      alert('Error fetching saved flashcards: ' + err.message);
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
    if (!file) return alert('Please select a PDF file first!');
    setLoading(true);
    setStatus('Analyzing document structure & visuals with Gemini 3.8 Flash...');

    try {
      handleStopSpeech();
      const formData = new FormData();
      formData.append('file', file);

      const teachRes = await fetch('/api/teach', { method: 'POST', body: formData });
      const teachData = await teachRes.json();

      if (teachData.error) throw new Error(teachData.error);
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
      if (fcData.error) throw new Error(fcData.error);
      setFlashcards(fcData.flashcards);

      setStatus('Ready!');
      setActiveTab('lesson');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading) return;

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
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setChatMessages([...newMessages, { role: 'model', content: data.reply }]);
    } catch (err: any) {
      alert('Chat Error: ' + err.message);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm uppercase tracking-wider">
              <Sparkles className="h-4 w-4" /> AI Zero-Backlog Engine
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-white">Catch-Up Tutor</h1>
          </div>
          <p className="text-slate-400 text-sm max-w-xs">
            Turn dense lecture PDFs into immersive audio lessons, interactive chat, and smart flashcards.
          </p>
        </header>

        {/* Upload Card */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/60 p-6 rounded-2xl shadow-xl space-y-4">
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
            </div>
          </div>

          <button
            onClick={handleUploadAndProcess}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3.5 rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <Upload className="h-5 w-5" />}
            {loading ? status : 'Process PDF & Launch Study Hub'}
          </button>
        </div>

        {/* Content Section */}
        <div className="space-y-6">
          
          {/* Navigation Tabs Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
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
              <button
                onClick={() => {
                  setActiveTab('saved-library');
                  fetchSavedFlashcards();
                }}
                className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition ${
                  activeTab === 'saved-library' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Database className="h-4 w-4" /> Supabase Library ({savedFlashcards.length})
              </button>
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

          {/* Lesson Tab */}
          {activeTab === 'lesson' && explanation && (
            <div className="markdown-content bg-slate-800/80 border border-slate-700/80 p-8 md:p-12 rounded-2xl shadow-xl max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkMath]} 
                rehypePlugins={[rehypeKatex]}
              >
                {explanation}
              </ReactMarkdown>
            </div>
          )}

          {/* Current Flashcards Tab (With LaTeX Math Support) */}
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
                          : 'bg-slate-700 text-slate-200 rounded-bl-none markdown-content'
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
                    <RefreshCw className="h-3 w-3 animate-spin" /> Tutor is thinking...
                  </div>
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