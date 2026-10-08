"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Banner, Button, Icons, Skeleton, Tag } from "@/components/ui";
import { useStore } from "@/components/store";
import {
  dimensionStats,
  formatPct,
  isQuestion,
  overallStats,
  type Question,
} from "@/lib/bank";

type Phase = "idle" | "working" | "error";

export default function ImportPage() {
  const { hydrated, store, importBank, clearBank, resetAttempts } = useStore();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function convertPdf(file: File) {
    setPhase("working");
    setError(null);
    setWarnings([]);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/convert", { method: "POST", body });
      const data = (await res.json()) as { questions?: Question[]; error?: string; warnings?: string[] };
      if (!res.ok || !data.questions) {
        throw new Error(data.error || "Conversion failed.");
      }
      importBank(data.questions, file.name);
      setWarnings(data.warnings ?? []);
      setPhase("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
      setPhase("error");
    }
  }

  async function loadJson(file: File) {
    setPhase("working");
    setError(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("That JSON file is not a question array.");
      const questions = parsed.filter(isQuestion);
      if (!questions.length) throw new Error("No readable questions found in that JSON file.");
      importBank(questions, file.name);
      setPhase("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that JSON file.");
      setPhase("error");
    }
  }

  async function loadSample() {
    setPhase("working");
    setError(null);
    try {
      const res = await fetch("/sample-questionbank.json");
      const parsed: unknown = await res.json();
      if (!Array.isArray(parsed)) throw new Error("Sample bank is malformed.");
      const questions = parsed.filter(isQuestion);
      if (!questions.length) throw new Error("Sample bank has no readable questions.");
      importBank(questions, "sample-questionbank.json");
      setPhase("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the sample bank.");
      setPhase("error");
    }
  }

  function accept(file: File) {
    if (file.name.toLowerCase().endsWith(".pdf")) return void convertPdf(file);
    if (file.name.toLowerCase().endsWith(".json")) return void loadJson(file);
    setError("That file is neither a .pdf nor a .json export.");
    setPhase("error");
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const bank = store.bank;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          {bank ? "Your bank" : "Import a question bank"}
        </h1>
        <p className="measure text-[15px] leading-relaxed text-zinc-600">
          {bank
            ? "Loaded and ready to drill. Replacing the bank keeps your attempt history for any question IDs that carry over."
            : "Drop a question-bank PDF and it converts to structured JSON right here on your machine — passage, choices, answer, and explanation."}
        </p>
      </div>

      {error ? <Banner tone="red" title="Import failed">{error}</Banner> : null}
      {warnings.length ? (
        <Banner tone="blue" title="Imported with warnings">
          <ul className="list-disc space-y-0.5 pl-4">
            {warnings.slice(0, 5).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Banner>
      ) : null}

      {!bank ? (
        <section className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload a question bank file"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) accept(file);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              dragging
                ? "border-blue-500 bg-blue-50"
                : "border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50"
            }`}
          >
            <span className="text-zinc-400">{Icons.upload({ size: 26 })}</span>
            <p className="text-sm font-medium text-zinc-800">
              Drop your PDF export here, or{" "}
              <span className="text-blue-700 underline underline-offset-2">choose a file</span>
            </p>
            <p className="text-[13px] text-zinc-500">
              questionbank-export-*.pdf · .json also accepted · converted locally
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.json,application/pdf,application/json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) accept(file);
              e.target.value = "";
            }}
          />

          <div className="flex items-center gap-4">
            <span className="text-[13px] text-zinc-400">or</span>
            <Button onClick={loadSample} loading={phase === "working"}>
              {phase === "working" ? "Loading…" : "Load the sample bank"}
            </Button>
            <span className="text-[13px] text-zinc-500">
              100 converted SAT Reading &amp; Writing questions
            </span>
          </div>
        </section>
      ) : (
        <BankSummary
          key={bank.importedAt}
          onReplace={() => inputRef.current?.click()}
          onErase={() => {
            if (window.confirm("Erase the loaded bank and all attempt history?")) {
              clearBank();
              setWarnings([]);
              setError(null);
            }
          }}
          onResetProgress={() => {
            if (window.confirm("Reset all right/wrong tracking for this bank?")) resetAttempts();
          }}
        />
      )}

      {bank ? (
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.json,application/pdf,application/json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) accept(file);
            e.target.value = "";
          }}
        />
      ) : null}
    </div>
  );
}

function BankSummary({
  onReplace,
  onErase,
  onResetProgress,
}: {
  onReplace: () => void;
  onErase: () => void;
  onResetProgress: () => void;
}) {
  const { store } = useStore();
  const bank = store.bank;
  if (!bank) return null;
  const questions = bank.questions;
  const stats = overallStats(questions, store.attempts);
  const domains = dimensionStats(questions, store.attempts, (q) => q.domain);
  const skills = dimensionStats(questions, store.attempts, (q) => q.skill);

  const cells = [
    { label: "Questions", value: String(stats.total) },
    { label: "Domains", value: String(domains.length) },
    { label: "Skills", value: String(skills.length) },
    { label: "Answered", value: `${stats.seen}` },
    { label: "Accuracy", value: formatPct(stats.accuracy) },
  ];

  return (
    <div className="space-y-8">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-zinc-500">
        <span className="font-medium text-zinc-800">{bank.source}</span>
        <span aria-hidden="true">·</span>
        <span className="tabular-nums">
          imported{" "}
          {new Date(bank.importedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <span aria-hidden="true">·</span>
        <span>{questions[0]?.assessment} {questions[0]?.test}</span>
      </p>

      <dl className="grid grid-cols-2 overflow-hidden rounded-xl border-t border-l border-zinc-200 sm:grid-cols-5">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="border-r border-b border-zinc-200 px-4 py-3"
          >
            <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {cell.label}
            </dt>
            <dd className="tabular-nums mt-0.5 text-xl font-semibold tracking-tight text-zinc-950">
              {cell.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/practice">
          <Button variant="primary">
            Start practice
            {Icons.arrowRight({ size: 15 })}
          </Button>
        </Link>
        <Link href="/bank">
          <Button>Browse the bank</Button>
        </Link>
        <Button variant="ghost" onClick={onReplace}>
          {Icons.upload({ size: 15 })}
          Replace file
        </Button>
        <Button variant="ghost" onClick={onResetProgress}>
          {Icons.rotate({ size: 15 })}
          Reset progress
        </Button>
        <Button variant="ghost" onClick={onErase} className="text-red-600 hover:text-red-700">
          {Icons.trash({ size: 15 })}
          Erase bank
        </Button>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <DimensionList title="Domains" stats={domains} />
        <DimensionList title="Skills" stats={skills} />
      </div>
    </div>
  );
}

function DimensionList({
  title,
  stats,
}: {
  title: string;
  stats: ReturnType<typeof dimensionStats>;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
        {stats.map((stat) => (
          <li key={stat.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="truncate text-sm text-zinc-800">
              {stat.key}
              {stat.seen > 0 ? (
                <span className="tabular-nums ml-2 text-[12px] text-zinc-500">
                  {stat.correct} right · {stat.wrong} wrong
                </span>
              ) : null}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <Tag tone={stat.seen ? "blue" : "neutral"}>
                <span className="tabular-nums">
                  {stat.seen}/{stat.total}
                </span>
              </Tag>
              <span className="tabular-nums w-9 text-right text-[13px] text-zinc-600">
                {formatPct(stat.accuracy)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
