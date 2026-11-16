"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
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
import {
  createTextSources,
  isIntakeSources,
  type IntakeSource,
} from "@/lib/intake-sources";
import TechnicalBrief from "./technical-brief";

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

type WorkspaceMode = "intake" | "technical-brief";
type SourceMethod = "pdf" | "text" | "notion";
type SelectedDisclosure = {
  title: string;
  origin: "sample" | "pdf" | "text" | "notion";
  sources: IntakeSource[];
  truncated?: boolean;
};

export default function IntakeWorkspace() {
  const [mode, setMode] = useState<WorkspaceMode>("intake");
  const [sourceMethod, setSourceMethod] = useState<SourceMethod>("pdf");
  const [selectedDisclosure, setSelectedDisclosure] = useState<SelectedDisclosure | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [pastedTitle, setPastedTitle] = useState("");
  const [notionPage, setNotionPage] = useState("");
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const [sourceError, setSourceError] = useState("");
  const [sourceNotice, setSourceNotice] = useState("");
  const [hasAiConsent, setHasAiConsent] = useState(false);
  const [analysis, setAnalysis] = useState<IntakeAnalysis | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"live" | "reference" | null>(null);
  const [brief, setBrief] = useState<ReviewBrief | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reviewComplete, setReviewComplete] = useState(false);

  const resetWorkflow = () => {
    setAnalysis(null);
    setAnalysisMode(null);
    setBrief(null);
    setCheckedItems([]);
    setReviewComplete(false);
    setErrorMessage("");
  };

  const selectDisclosure = (disclosure: SelectedDisclosure) => {
    setSelectedDisclosure(disclosure);
    setHasAiConsent(false);
    setSourceError("");
    setSourceNotice("");
    resetWorkflow();
  };

  const loadSampleDisclosure = () => {
    selectDisclosure({
      title: sampleDisclosure.title,
      origin: "sample",
      sources: sampleDisclosure.sources.map((source) => ({ ...source })),
    });
  };

  const loadPdf = async () => {
    if (!pdfFile) {
      setSourceError("Choose a PDF disclosure first.");
      return;
    }

    setSourceError("");
    setSourceNotice("");
    setIsLoadingSource(true);
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      const response = await fetch("/api/intake/parse-pdf", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Could not read the PDF disclosure.");
      }
      if (typeof result.title !== "string" || !isIntakeSources(result.sources)) {
        throw new Error("The PDF did not produce readable source passages.");
      }
      selectDisclosure({ title: result.title, origin: "pdf", sources: result.sources });
      setPdfFile(null);
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "Could not read the PDF disclosure.");
    } finally {
      setIsLoadingSource(false);
    }
  };

  const usePastedText = () => {
    setSourceError("");
    setSourceNotice("");
    try {
      const sources = createTextSources(pastedText);
      if (!sources.length) {
        throw new Error("Paste the disclosure text before continuing.");
      }
      selectDisclosure({
        title: pastedTitle.trim() || "Pasted invention disclosure",
        origin: "text",
        sources,
      });
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "Could not use the pasted text.");
    }
  };

  const importNotion = async () => {
    if (!notionPage.trim()) {
      setSourceError("Paste a Notion page URL or ID first.");
      return;
    }

    setSourceError("");
    setSourceNotice("");
    setIsLoadingSource(true);
    try {
      const response = await fetch("/api/notion/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageUrlOrId: notionPage }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Could not import the Notion page.");
      }
      if (typeof result.title !== "string" || typeof result.lectureText !== "string") {
        throw new Error("The Notion page did not include readable text.");
      }
      const sources = createTextSources(result.lectureText);
      if (!sources.length) throw new Error("The Notion page did not include readable text.");
      selectDisclosure({
        title: result.title,
        origin: "notion",
        sources,
        truncated: result.truncated === true,
      });
      if (result.truncated) {
        setSourceNotice("Only the first 40,000 characters were imported.");
      }
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "Could not import the Notion page.");
    } finally {
      setIsLoadingSource(false);
    }
  };

  const runAnalysis = async () => {
    if (!selectedDisclosure) {
      setErrorMessage("Load a disclosure before analyzing it.");
      return;
    }
    if (selectedDisclosure.origin !== "sample" && !hasAiConsent) {
      setErrorMessage("Confirm that this non-confidential source may be sent to Gemini.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage("");
    setReviewComplete(false);
    setCheckedItems([]);

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: selectedDisclosure.sources }),
      });
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
    if (selectedDisclosure?.origin !== "sample") return;
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
      notice: "AI-assisted draft; verify against the cited source. Not legal advice or a patentability assessment.",
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

  const canUseAi = Boolean(
    selectedDisclosure &&
      (selectedDisclosure.origin === "sample" || hasAiConsent),
  );

  return (
    <main className="intake-page min-h-screen">
      <div className="intake-shell mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <nav className="intake-nav flex items-center justify-between" aria-label="Main navigation">
          <Link
            href="/tutor"
            className="intake-backlink inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Study tutor
          </Link>
          <span className="intake-portfolio rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            Integrated workflow demo
          </span>
        </nav>

        <header className="intake-hero mx-auto max-w-3xl py-14 text-center sm:py-20">
          <div className="intake-mark mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="intake-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">
            IP workflow copilot
          </p>
          <h1 className="intake-title mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            IP Intake & Technical Brief Copilot
          </h1>
          <p className="intake-intro mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Bring a non-confidential disclosure as a text PDF, pasted text, or
            optional Notion page. Use that same source for a traceable intake
            draft and a technical briefing with grounded Q&A.
          </p>
          <div className="intake-process mt-7 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-600">
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
              1. Shared disclosure
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
              2. Intake review
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
              3. Technical briefing
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
                  Shared disclosure source
                </p>
                <h2 className="mt-1 text-lg font-semibold leading-6 text-slate-950">
                  Add your source material
                </h2>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              One selected source powers both intake review and the technical
              brief. Choose a PDF, paste text, or import an optional Notion page.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" aria-label="Source input method">
              {([
                ["pdf", "PDF"],
                ["text", "Paste text"],
                ["notion", "Notion"],
              ] as const).map(([method, label]) => (
                <button
                  key={method}
                  type="button"
                  aria-pressed={sourceMethod === method}
                  onClick={() => setSourceMethod(method)}
                  className={`min-h-10 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                    sourceMethod === method
                      ? "bg-white text-indigo-800 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {sourceMethod === "pdf" && (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Text-based invention disclosure PDF
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-800"
                  />
                </label>
                <button
                  type="button"
                  onClick={loadPdf}
                  disabled={isLoadingSource}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingSource && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {isLoadingSource ? "Reading PDF..." : "Use this PDF"}
                </button>
                <p className="text-xs leading-5 text-slate-500">
                  Text extraction happens locally. Scanned PDFs without selectable
                  text need an OCR transcript pasted as text.
                </p>
              </div>
            )}

            {sourceMethod === "text" && (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Source title (optional)
                  </span>
                  <input
                    type="text"
                    maxLength={120}
                    value={pastedTitle}
                    onChange={(event) => setPastedTitle(event.target.value)}
                    placeholder="e.g. Invention disclosure"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Disclosure text (up to 40,000 characters)
                  </span>
                  <textarea
                    rows={8}
                    maxLength={40_000}
                    value={pastedText}
                    onChange={(event) => setPastedText(event.target.value)}
                    placeholder="Paste a non-confidential invention description..."
                    className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={usePastedText}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Use pasted text
                </button>
              </div>
            )}

            {sourceMethod === "notion" && (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Notion page URL or ID
                  </span>
                  <input
                    type="text"
                    maxLength={500}
                    value={notionPage}
                    onChange={(event) => setNotionPage(event.target.value)}
                    placeholder="Paste a shared Notion page URL"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={importNotion}
                  disabled={isLoadingSource}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingSource ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <BookOpen className="h-4 w-4" />
                  )}
                  {isLoadingSource ? "Importing..." : "Import Notion page"}
                </button>
                <p className="text-xs leading-5 text-slate-500">
                  Requires the optional Notion integration and page access shared with it.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={loadSampleDisclosure}
              disabled={isLoadingSource}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4" />
              Try fictional sample
            </button>

            {sourceError && (
              <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {sourceError}
              </p>
            )}
            {sourceNotice && (
              <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {sourceNotice}
              </p>
            )}

            {selectedDisclosure ? (
              <section className="mt-6 border-t border-slate-100 pt-5" aria-label="Loaded disclosure passages">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {selectedDisclosure.origin === "sample"
                        ? "Fictional sample"
                        : `Loaded from ${selectedDisclosure.origin}`}
                    </p>
                    <h3 className="mt-1 break-words text-base font-semibold text-slate-950">
                      {selectedDisclosure.title}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {selectedDisclosure.sources.length} passages
                  </span>
                </div>
                <div className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto">
                  {selectedDisclosure.sources.map((source) => (
                    <article
                      key={source.id}
                      className="intake-passage rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-slate-800">
                          [{source.id}] {source.heading}
                        </h4>
                        {source.page !== undefined && (
                          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                            Page {source.page}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {source.text}
                      </p>
                    </article>
                  ))}
                </div>

                {selectedDisclosure.origin !== "sample" && (
                  <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-950">
                    <input
                      type="checkbox"
                      checked={hasAiConsent}
                      onChange={(event) => setHasAiConsent(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400 accent-amber-800"
                    />
                    <span>
                      I confirm this material is non-confidential and may be sent
                      to Google Gemini for AI processing.
                    </span>
                  </label>
                )}
              </section>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                No source loaded yet. The fictional sample is optional; use your
                own non-confidential disclosure to try the workflow.
              </div>
            )}

            <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-950">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                AI actions send the selected source to Google Gemini. Never use
                confidential, client, or patent-pending information here.
              </p>
            </div>
          </aside>

          <section className="intake-panel intake-workspace-panel rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-busy={isAnalyzing}>
            <div className="mb-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Copilot workflow">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "intake"}
                aria-controls="intake-workflow-panel"
                disabled={!selectedDisclosure}
                onClick={() => setMode("intake")}
                className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  mode === "intake"
                    ? "bg-white text-indigo-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Intake review
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "technical-brief"}
                aria-controls="intake-workflow-panel"
                disabled={!selectedDisclosure}
                onClick={() => setMode("technical-brief")}
                className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  mode === "technical-brief"
                    ? "bg-white text-indigo-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Technical brief
              </button>
            </div>
            <div id="intake-workflow-panel" role="tabpanel">
              {mode === "technical-brief" ? (
                selectedDisclosure ? (
                  <TechnicalBrief
                    key={`${selectedDisclosure.origin}-${selectedDisclosure.title}`}
                    courseTitle={selectedDisclosure.title}
                    sources={selectedDisclosure.sources}
                    canUseAi={canUseAi}
                  />
                ) : (
                  <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
                    Load a disclosure in the source panel to start a technical brief.
                  </div>
                )
              ) : selectedDisclosure ? (
                <>
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
                  disabled={isAnalyzing || !canUseAi}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAnalyzing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isAnalyzing
                    ? "Analyzing..."
                    : analysisMode === "live"
                      ? "Run again"
                      : selectedDisclosure.origin === "sample"
                        ? "Analyze sample"
                        : "Analyze disclosure"}
                </button>
                {selectedDisclosure.origin === "sample" && (
                  <button
                    type="button"
                    onClick={loadPreparedExample}
                    disabled={isAnalyzing}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FileText className="h-4 w-4" />
                    View prepared example
                  </button>
                )}
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
                  Ready to analyze this disclosure?
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                  Run the disclosure to create structured intake notes, linked
                  passages, and questions for a human reviewer.
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
                      Citations resolve to the loaded passages
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
                                  {citation.page === undefined ? citation.heading : `Page ${citation.page} · ${citation.heading}`}
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
                    Review status stays in this browser session; this demo does not file or save the review.
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
                </>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
                  <div className="rounded-full bg-white p-3 text-indigo-600 shadow-sm ring-1 ring-slate-200">
                    <CircleHelp className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">
                    Load a disclosure to begin
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    Add a PDF, paste text, or import a Notion page in the source panel.
                    Both workflow modes use the same material.
                  </p>
                </div>
              )}
            </div>
          </section>
        </section>

        <footer className="py-10 text-center text-xs text-slate-500">
          Built as a portfolio prototype ·{" "}
          <Link href="/tutor" className="font-medium text-indigo-700 hover:text-indigo-900">
            Open the standalone study tutor
          </Link>
        </footer>
      </div>
    </main>
  );
}
