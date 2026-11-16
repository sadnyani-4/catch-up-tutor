"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import {
  sampleDisclosure,
  type IntakeAnalysis,
  preparedIntakeExample,
} from "@/lib/intake-demo";

const reviewChecks = [
  "I checked the linked source passages.",
  "I reviewed and edited the draft brief.",
  "I checked the follow-up questions.",
];

type ReviewBrief = {
  summary: string;
  problem: string;
  proposedSolution: string;
};

export default function IntakeWorkspace() {
  const [analysis, setAnalysis] = useState<IntakeAnalysis | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"live" | "reference" | null>(null);
  const [brief, setBrief] = useState<ReviewBrief | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reviewComplete, setReviewComplete] = useState(false);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setErrorMessage("");
    setReviewComplete(false);
    setCheckedItems([]);

    try {
      const response = await fetch("/api/intake", { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "The intake workflow could not run.");
      }

      const nextAnalysis = result.analysis as IntakeAnalysis;
      setAnalysis(nextAnalysis);
      setAnalysisMode("live");
      setBrief({
        summary: nextAnalysis.summary,
        problem: nextAnalysis.problem,
        proposedSolution: nextAnalysis.proposedSolution,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The intake workflow could not run.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadPreparedExample = () => {
    setErrorMessage("");
    setReviewComplete(false);
    setCheckedItems([]);
    setAnalysis(preparedIntakeExample);
    setAnalysisMode("reference");
    setBrief({
      summary: preparedIntakeExample.summary,
      problem: preparedIntakeExample.problem,
      proposedSolution: preparedIntakeExample.proposedSolution,
    });
  };

  const toggleReviewCheck = (item: string) => {
    setCheckedItems((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item],
    );
    setReviewComplete(false);
  };

  const downloadBrief = () => {
    if (!analysis || !brief) return;

    const exportData = {
      ...brief,
      elements: analysis.elements,
      followUpQuestions: analysis.followUpQuestions,
      reviewComplete,
      notice: "Synthetic demo output; not legal advice or a patentability assessment.",
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "invention-intake-brief.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="intake-page min-h-screen">
      <div className="intake-shell mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <nav className="intake-nav flex items-center justify-between" aria-label="Main navigation">
          <Link
            href="/"
            className="intake-backlink inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Catch-Up Tutor
          </Link>
          <span className="intake-portfolio rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            Portfolio workflow demo
          </span>
        </nav>

        <header className="intake-hero mx-auto max-w-3xl py-14 text-center sm:py-20">
          <div className="intake-mark mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="intake-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">
            Evidence-first AI workflow
          </p>
          <h1 className="intake-title mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Invention Intake Copilot
          </h1>
          <p className="intake-intro mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Turn a fictional invention disclosure into a traceable draft brief,
            surface questions, and leave the final review to a person.
          </p>
          <div className="intake-process mt-7 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-600">
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
              1. Extract
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
              2. Link evidence
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
              3. Human review
            </span>
          </div>
        </header>

        <section className="intake-layout grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="intake-panel intake-source-panel h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Fictional sample disclosure
                </p>
                <h2 className="mt-1 text-lg font-semibold leading-6 text-slate-950">
                  {sampleDisclosure.title}
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {sampleDisclosure.description}
            </p>

            <div className="mt-6 space-y-3">
              {sampleDisclosure.sources.map((source) => (
                <article
                  key={source.id}
                  className="intake-passage rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-800">
                      {source.heading}
                    </h3>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                      Page {source.page}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{source.text}</p>
                </article>
              ))}
            </div>

            <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-950">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                This demo sends only the fictional sample above to the configured
                AI provider. Do not enter or upload confidential client material.
              </p>
            </div>
          </aside>

          <section className="intake-panel intake-workspace-panel rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-busy={isAnalyzing}>
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  Intake workspace
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Prepare a review brief
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAnalyzing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isAnalyzing ? "Analyzing..." : analysisMode === "live" ? "Run again" : "Analyze sample"}
                </button>
                <button
                  type="button"
                  onClick={loadPreparedExample}
                  disabled={isAnalyzing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  View prepared example
                </button>
              </div>
            </div>

            <div className="my-5 grid gap-2 sm:grid-cols-3">
              {[
                ["Extract", "Draft structured facts"],
                ["Ground", "Link facts to source pages"],
                ["Review", "Edit before export"],
              ].map(([label, detail], index) => (
                <div key={label} className="intake-step rounded-xl bg-slate-50 px-3 py-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    0{index + 1} / {label}
                  </span>
                  <p className="mt-1 text-xs text-slate-600">{detail}</p>
                </div>
              ))}
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
              >
                {errorMessage}
              </div>
            )}

            {!analysis && !isAnalyzing && !errorMessage && (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
                <div className="rounded-full bg-white p-3 text-indigo-600 shadow-sm ring-1 ring-slate-200">
                  <CircleHelp className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">
                  Ready to explore the workflow?
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                  Run the sample to see structured intake notes, linked passages,
                  and questions for a human reviewer.
                </p>
              </div>
            )}

            {analysis && brief && (
              <div className="space-y-7">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-950">
                      <Sparkles className="h-4 w-4" />
                      Draft intake summary
                    </div>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-indigo-800 ring-1 ring-indigo-200">
                      {analysisMode === "reference" ? "Prepared example · not live AI output" : "AI draft · review required"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-indigo-950/80">
                    {analysis.inventionTitle}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Editable brief
                  </h3>
                  {(
                    [
                      ["summary", "Short summary"],
                      ["problem", "Problem described"],
                      ["proposedSolution", "Proposed solution"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                        {label}
                      </span>
                      <textarea
                        rows={key === "summary" ? 3 : 4}
                        value={brief[key]}
                        onChange={(event) => {
                          setBrief({ ...brief, [key]: event.target.value });
                          setReviewComplete(false);
                        }}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                      />
                    </label>
                  ))}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Technical elements and evidence
                    </h3>
                    <span className="text-xs text-slate-500">
                      Citations resolve to the sample passages
                    </span>
                  </div>
                  <div className="space-y-3">
                    {analysis.elements.map((element, index) => (
                      <article
                        key={`${element.name}-${index}`}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <h4 className="text-sm font-semibold text-slate-900">
                          {element.name}
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {element.description}
                        </p>
                        {element.citations.length ? (
                          <div className="mt-3 space-y-2">
                            {element.citations.map((citation) => (
                              <blockquote
                                key={citation.sourceId}
                                className="border-l-2 border-indigo-300 pl-3 text-xs leading-5 text-slate-600"
                              >
                                <span className="font-semibold text-indigo-700">
                                  Page {citation.page} · {citation.heading}
                                </span>
                                <span className="block mt-1">“{citation.excerpt}”</span>
                              </blockquote>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            No source passage was linked. Verify this point before relying on it.
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Questions to clarify with the inventor
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {analysis.followUpQuestions.map((question, index) => (
                      <li
                        key={`${question}-${index}`}
                        className="flex gap-2 text-sm leading-6 text-slate-700"
                      >
                        <CircleHelp className="mt-1 h-4 w-4 shrink-0 text-indigo-600" />
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                  <h3 className="text-sm font-semibold text-emerald-950">
                    Human review checkpoint
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-emerald-900/80">
                    Review status is only held in this browser session; nothing is filed or sent.
                  </p>
                  <div className="mt-4 space-y-3">
                    {reviewChecks.map((item) => (
                      <label key={item} className="flex cursor-pointer items-start gap-2.5 text-sm text-emerald-950">
                        <input
                          type="checkbox"
                          checked={checkedItems.includes(item)}
                          onChange={() => toggleReviewCheck(item)}
                          className="mt-0.5 h-4 w-4 rounded border-emerald-300 accent-emerald-700"
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={checkedItems.length !== reviewChecks.length}
                      onClick={() => setReviewComplete(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      Mark review complete
                    </button>
                    <button
                      type="button"
                      onClick={downloadBrief}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                      Export brief
                    </button>
                    {reviewComplete && (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800" role="status">
                        <CheckCircle2 className="h-4 w-4" />
                        Review complete for this session
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
              Demonstration only. This workflow does not assess novelty,
              patentability, infringement, or legal rights and is not legal advice.
            </p>
          </section>
        </section>

        <footer className="py-10 text-center text-xs text-slate-500">
          Built as a portfolio prototype ·{" "}
          <Link href="/" className="font-medium text-indigo-700 hover:text-indigo-900">
            Explore the study tutor
          </Link>
        </footer>
      </div>
    </main>
  );
}
