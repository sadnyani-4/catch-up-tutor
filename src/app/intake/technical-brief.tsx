"use client";

import { useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Layers,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { parseChatStreamEvent } from "@/lib/chat-stream";
import type { IntakeSource } from "@/lib/intake-sources";

type Flashcard = { question: string; answer: string };
type ChatMessage = { role: "user" | "model"; content: string };

const isFlashcard = (value: unknown): value is Flashcard =>
  typeof value === "object" &&
  value !== null &&
  "question" in value &&
  typeof value.question === "string" &&
  "answer" in value &&
  typeof value.answer === "string";

type TechnicalBriefProps = {
  courseTitle: string;
  sources: IntakeSource[];
  canUseAi: boolean;
};

export default function TechnicalBrief({
  courseTitle,
  sources,
  canUseAi,
}: TechnicalBriefProps) {
  const [brief, setBrief] = useState("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flippedCard, setFlippedCard] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatStatus, setChatStatus] = useState("Preparing a grounded answer...");
  const [chatError, setChatError] = useState("");

  const generateBrief = async () => {
    setIsGenerating(true);
    setErrorMessage("");
    setGenerationStatus("Drafting a technical explanation...");

    try {
      const briefResponse = await fetch("/api/teach-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, purpose: "invention-review" }),
      });
      const briefResult = await briefResponse.json();
      if (!briefResponse.ok || briefResult.error) {
        throw new Error(briefResult.error || "Could not generate the technical brief.");
      }
      if (typeof briefResult.explanation !== "string" || !briefResult.explanation.trim()) {
        throw new Error("The AI did not return a technical brief.");
      }

      setGenerationStatus("Building reviewer flashcards...");
      const cardsResponse = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources,
          courseTitle,
          purpose: "invention-review",
        }),
      });
      const cardsResult = await cardsResponse.json();
      if (!cardsResponse.ok || cardsResult.error) {
        throw new Error(cardsResult.error || "Could not generate reviewer flashcards.");
      }
      if (
        !Array.isArray(cardsResult.flashcards) ||
        !cardsResult.flashcards.every(isFlashcard)
      ) {
        throw new Error("The AI returned invalid reviewer flashcards.");
      }

      setBrief(briefResult.explanation);
      setFlashcards(cardsResult.flashcards);
      setMessages([]);
      setChatError("");
      setFlippedCard(null);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Could not generate the technical brief.");
    } finally {
      setGenerationStatus("");
      setIsGenerating(false);
    }
  };

  const sendQuestion = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isChatLoading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmedQuestion },
    ];
    setMessages(nextMessages);
    setQuestion("");
    setChatError("");
    setChatStatus("Preparing a grounded answer...");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-40),
          sources,
          mode: "invention-review",
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "The technical assistant could not answer.");
      }
      if (!response.body) throw new Error("The answer stream is unavailable.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      let isComplete = false;
      let streamError: string | undefined;

      const processLine = (line: string) => {
        if (!line.trim()) return;
        const event = parseChatStreamEvent(line);
        if (event.type === "status") setChatStatus(event.message);
        if (event.type === "token") {
          answer += event.text;
          setMessages([...nextMessages, { role: "model", content: answer }]);
          setChatStatus("Writing a source-grounded answer...");
        }
        if (event.type === "error") streamError = event.message;
        if (event.type === "done") isComplete = true;
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
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
      if (!isComplete || !answer.trim()) {
        throw new Error("The answer stream ended unexpectedly.");
      }
    } catch (error: unknown) {
      setChatError(error instanceof Error ? error.message : "The technical assistant could not answer.");
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Technical briefing
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            Understand the disclosed system
          </h2>
        </div>
        <button
          type="button"
          onClick={generateBrief}
          disabled={isGenerating || !canUseAi}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isGenerating ? generationStatus : brief ? "Regenerate brief" : "Generate technical brief"}
        </button>
      </div>

      <p className="text-sm leading-6 text-slate-600">
        This mode uses the same selected source passages shown beside the intake
        review. It explains the engineering disclosure for a reviewer; it does
        not make legal assessments.
      </p>

      {!canUseAi && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Confirm the source is non-confidential and may be sent to Gemini before generating or asking questions.
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {errorMessage}
        </p>
      )}

      {!brief && !isGenerating && !errorMessage && (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
          <div className="rounded-full bg-white p-3 text-indigo-600 shadow-sm ring-1 ring-slate-200">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">
            Generate a technical briefing from this case
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            The AI will explain the disclosed components, operation, and
            unresolved details using the source passages on the left.
          </p>
        </div>
      )}

      {brief && (
        <>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Source-grounded technical brief
            </div>
            <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {brief}
              </ReactMarkdown>
            </div>
          </article>

          {flashcards.length > 0 && (
            <section aria-labelledby="reviewer-cards-heading">
              <h3 id="reviewer-cards-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Layers className="h-4 w-4 text-indigo-600" />
                Reviewer study cards ({flashcards.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {flashcards.map((card, index) => (
                  <button
                    key={`${card.question}-${index}`}
                    type="button"
                    onClick={() => setFlippedCard(flippedCard === index ? null : index)}
                    className="min-h-36 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                      Card {index + 1} · {flippedCard === index ? "Answer" : "Question"}
                    </span>
                    <span className="mt-3 block text-sm leading-6 text-slate-800">
                      {flippedCard === index ? card.answer : card.question}
                    </span>
                    <span className="mt-3 block text-xs text-slate-500">
                      Click to {flippedCard === index ? "show question" : "reveal answer"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-busy={isChatLoading}>
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              Ask about this invention
            </div>
            <div className="max-h-96 min-h-48 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-500">
                  Ask for an explanation of a component or how the disclosed system works.
                </p>
              )}
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-auto bg-indigo-600 text-white"
                      : "mr-auto bg-slate-100 text-slate-800"
                  }`}
                >
                  {message.role === "model" ? (
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {message.content}
                    </ReactMarkdown>
                  ) : message.content}
                </div>
              ))}
              {isChatLoading && (
                <p className="flex items-center gap-2 text-xs italic text-slate-500" role="status">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  {chatStatus}
                </p>
              )}
              {chatError && (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {chatError}
                </p>
              )}
            </div>
            <form onSubmit={sendQuestion} className="flex gap-2 border-t border-slate-100 p-3">
              <input
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={!canUseAi || isChatLoading}
                maxLength={4000}
                placeholder="Ask a technical question about the source..."
                aria-label="Ask about this invention"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
              <button
                type="submit"
                disabled={!canUseAi || isChatLoading || !question.trim()}
                aria-label="Send question"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
