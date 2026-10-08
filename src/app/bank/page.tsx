"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { Button, Icons, ProgressBar, Select, Skeleton, Tag } from "@/components/ui";
import {
  CHOICE_LETTERS,
  DEFAULT_FILTERS,
  SORT_LABELS,
  STATUS_FILTER_LABELS,
  accuracy,
  dimensionStats,
  filterQuestions,
  formatPct,
  groupAndSort,
  statusOf,
  unique,
  type FilterState,
  type Question,
  type SortKey,
  type StatusFilter,
} from "@/lib/bank";

const SORT_KEYS: SortKey[] = ["skill", "domain", "difficulty", "accuracy", "attempts", "id"];
const STATUS_OPTIONS: StatusFilter[] = ["all", "unseen", "seen", "mistakes", "mastered"];

export default function BankPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <BankContent />
    </Suspense>
  );
}

function BankContent() {
  const { hydrated, store, resetAttempts } = useStore();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => {
    const domain = searchParams.get("domain");
    const skill = searchParams.get("skill");
    return {
      ...DEFAULT_FILTERS,
      domains: domain ? [domain] : [],
      skills: skill ? [skill] : [],
    };
  });
  const [sort, setSort] = useState<SortKey>("skill");
  const [openId, setOpenId] = useState<string | null>(null);

  const questions = useMemo(() => store.bank?.questions ?? [], [store.bank]);
  const domains = useMemo(() => unique(questions.map((q) => q.domain)), [questions]);
  const skills = useMemo(() => unique(questions.map((q) => q.skill)), [questions]);

  const filtered = useMemo(
    () => filterQuestions(questions, filters, store.attempts),
    [questions, filters, store.attempts],
  );
  const groups = useMemo(
    () => groupAndSort(filtered, sort, store.attempts),
    [filtered, sort, store.attempts],
  );
  const domainStats = useMemo(
    () => dimensionStats(questions, store.attempts, (q) => q.domain),
    [questions, store.attempts],
  );
  const skillStats = useMemo(
    () => dimensionStats(questions, store.attempts, (q) => q.skill),
    [questions, store.attempts],
  );

  if (!hydrated) return <Skeleton className="h-96 w-full" />;

  if (!store.bank) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">Bank</h1>
        <p className="text-[15px] text-zinc-600">
          No bank loaded yet — import a PDF to browse, sort, and filter questions.
        </p>
        <Link href="/">
          <Button variant="primary">{Icons.upload({ size: 15 })} Go to import</Button>
        </Link>
      </div>
    );
  }

  const activeFilters =
    filters.domains.length + filters.skills.length + (filters.status !== "all" ? 1 : 0) + (filters.search ? 1 : 0);

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">Bank</h1>
        <p className="measure text-[15px] leading-relaxed text-zinc-600">
          Every question in <span className="font-medium text-zinc-800">{store.bank.source}</span>,
          sortable by skill or domain and filterable down to what you keep missing.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProgressTable
          title="By domain"
          rows={domainStats}
          active={filters.domains}
          onPick={(key) =>
            setFilters((f) => ({
              ...f,
              domains: f.domains.includes(key) ? [] : [key],
            }))
          }
        />
        <ProgressTable
          title="By skill"
          rows={skillStats}
          active={filters.skills}
          onPick={(key) =>
            setFilters((f) => ({
              ...f,
              skills: f.skills.includes(key) ? [] : [key],
            }))
          }
        />
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              {Icons.search({ size: 15 })}
            </span>
            <input
              type="search"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search question text or ID"
              aria-label="Search questions"
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-[13px] text-zinc-900 placeholder:text-zinc-400 transition-colors hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            />
          </div>
          <Select
            aria-label="Filter by domain"
            value={filters.domains[0] ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, domains: e.target.value ? [e.target.value] : [] }))
            }
          >
            <option value="">All domains</option>
            {domains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by skill"
            value={filters.skills[0] ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, skills: e.target.value ? [e.target.value] : [] }))
            }
          >
            <option value="">All skills</option>
            {skills.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as StatusFilter }))}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_FILTER_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            {SORT_KEYS.map((k) => (
              <option key={k} value={k}>
                Sort: {SORT_LABELS[k]}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 text-[13px] text-zinc-500">
          <span className="tabular-nums">
            Showing {filtered.length} of {questions.length} questions
            {activeFilters ? ` · ${activeFilters} filter${activeFilters > 1 ? "s" : ""} on` : ""}
          </span>
          {activeFilters ? (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <div className="space-y-3 rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center">
            <p className="text-sm font-medium text-zinc-800">No questions match</p>
            <p className="text-[13px] text-zinc-500">
              Try a different skill, domain, or status filter.
            </p>
            <Button size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            {groups.map((group) => (
              <div key={group.label || "all"}>
                {group.label ? (
                  <h2 className="sticky top-14 z-10 border-b border-zinc-200 bg-zinc-50/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 backdrop-blur-sm">
                    {group.label}
                    <span className="tabular-nums ml-2 font-normal text-zinc-400">
                      {group.rows.length}
                    </span>
                  </h2>
                ) : null}
                <ul className="divide-y divide-zinc-100">
                  {group.rows.map((q) => (
                    <QuestionRow
                      key={q.id}
                      question={q}
                      open={openId === q.id}
                      showDomain={sort !== "domain"}
                      onToggle={() => setOpenId(openId === q.id ? null : q.id)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-5">
        <span className="mr-2 text-[13px] text-zinc-500">Tracking data stays in this browser.</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm("Reset all right/wrong tracking for this bank?")) resetAttempts();
          }}
        >
          {Icons.rotate({ size: 14 })}
          Reset attempt data
        </Button>
        <Link href="/">
          <Button variant="ghost" size="sm">
            {Icons.upload({ size: 14 })}
            Replace bank
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ProgressTable({
  title,
  rows,
  active,
  onPick,
}: {
  title: string;
  rows: ReturnType<typeof dimensionStats>;
  active: string[];
  onPick: (key: string) => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
      <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
        {rows.map((row) => {
          const isActive = active.includes(row.key);
          return (
            <li key={row.key}>
              <button
                type="button"
                onClick={() => onPick(row.key)}
                aria-pressed={isActive}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600 ${
                  isActive ? "bg-blue-50" : "hover:bg-zinc-50"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-zinc-800">{row.key}</span>
                  <span className="mt-1 block max-w-40">
                    <ProgressBar value={row.accuracy ?? 0} tone="blue" />
                  </span>
                </span>
                <span className="tabular-nums shrink-0 text-right text-[13px] leading-tight">
                  <span className="block font-medium text-zinc-800">{formatPct(row.accuracy)}</span>
                  <span className="block text-zinc-500">
                    {row.seen}/{row.total}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function QuestionRow({
  question,
  open,
  showDomain,
  onToggle,
}: {
  question: Question;
  open: boolean;
  showDomain: boolean;
  onToggle: () => void;
}) {
  const { store } = useStore();
  const attempt = store.attempts[question.id];
  const status = statusOf(attempt);
  const acc = accuracy(attempt);

  return (
    <li className={open ? "bg-zinc-50/60" : "bg-white"}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600"
      >
        <span className="w-[4.75rem] shrink-0 font-mono text-[12px] text-zinc-400">{question.id}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-zinc-900">
            {showDomain ? question.skill : question.domain}
          </span>
          <span className="block truncate text-[12px] text-zinc-500 sm:hidden">
            {showDomain ? question.domain : question.skill}
          </span>
        </span>
        <span className="hidden shrink-0 sm:block">
          <Tag tone="neutral">{showDomain ? question.domain : question.skill}</Tag>
        </span>
        <span className="tabular-nums hidden w-24 shrink-0 text-right text-[12px] sm:block">
          {status === "unseen" ? (
            <span className="text-zinc-400">Unseen</span>
          ) : (
            <>
              <span className="text-emerald-700">{attempt?.correct} right</span>
              <span className="text-zinc-300"> · </span>
              <span className="text-red-600">{attempt?.wrong} wrong</span>
            </>
          )}
        </span>
        <span className="tabular-nums w-10 shrink-0 text-right text-[13px] text-zinc-600">
          {formatPct(acc)}
        </span>
        <span
          className={`shrink-0 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          {Icons.chevronDown({ size: 15 })}
        </span>
      </button>
      {open ? <QuestionDetail question={question} /> : null}
    </li>
  );
}

function QuestionDetail({ question }: { question: Question }) {
  const { store } = useStore();
  const attempt = store.attempts[question.id];
  const last = attempt?.last;

  return (
    <div className="animate-rise space-y-4 border-t border-zinc-200 px-4 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="blue">{question.domain}</Tag>
        <Tag>{question.skill}</Tag>
        <Tag tone={question.difficulty === "Hard" ? "amber" : "neutral"}>
          {question.difficulty}
        </Tag>
        {attempt && attempt.correct + attempt.wrong > 0 ? (
          <span className="tabular-nums text-[12px] text-zinc-500">
            attempted {attempt.correct + attempt.wrong}× · last answer{" "}
            <span className={last === "correct" ? "text-emerald-700" : "text-red-600"}>
              {last === "correct" ? "right" : "wrong"}
            </span>
          </span>
        ) : (
          <span className="text-[12px] text-zinc-400">not attempted yet</span>
        )}
      </div>

      <div className="measure space-y-3 text-[15px] leading-[1.75] text-zinc-900">
        {question.question.split("\n\n").map((para, i) => (
          <p key={i} className="whitespace-pre-line">
            {para}
          </p>
        ))}
      </div>

      <ul className="max-w-3xl space-y-2">
        {CHOICE_LETTERS.map((letter) => {
          const isAnswer = letter === question.answer;
          const isBadPick = !isAnswer && last === "wrong" && attempt?.lastPick === letter;
          return (
            <li
              key={letter}
              className={`flex items-start gap-3 rounded-xl border px-4 py-2.5 text-[14px] leading-relaxed ${
                isAnswer
                  ? "border-emerald-500 bg-emerald-50"
                  : isBadPick
                    ? "border-red-400 bg-red-50"
                    : "border-zinc-200 bg-white"
              }`}
            >
              <span
                className={`mt-px flex size-5 shrink-0 items-center justify-center rounded border text-[11px] font-semibold ${
                  isAnswer
                    ? "border-emerald-500 bg-emerald-600 text-white"
                    : isBadPick
                      ? "border-red-500 bg-red-600 text-white"
                      : "border-zinc-300 bg-zinc-50 text-zinc-600"
                }`}
              >
                {letter}
              </span>
              <span className="whitespace-pre-line text-zinc-900">
                {question.choices[letter]}
              </span>
              {isAnswer ? (
                <span className="ml-auto shrink-0 self-center text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  Answer
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="max-w-3xl rounded-xl border border-zinc-200 bg-white px-4 py-3.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Explanation</p>
        <div className="measure mt-2 space-y-3 text-[14px] leading-relaxed text-zinc-800">
          {question.explanation.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
