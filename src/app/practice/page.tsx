"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { Banner, Button, Icons, ProgressBar, Select, Skeleton, Tag } from "@/components/ui";
import {
  CHOICE_LETTERS,
  DEFAULT_FILTERS,
  STATUS_FILTER_LABELS,
  filterQuestions,
  formatPct,
  shuffle,
  unique,
  type Choice,
  type StatusFilter,
} from "@/lib/bank";

type Session = {
  ids: string[];
  idx: number;
  answers: Record<string, Choice>;
};

const STATUS_OPTIONS: StatusFilter[] = ["all", "unseen", "seen", "mistakes", "mastered"];

export default function PracticePage() {
  const { hydrated, store, record } = useStore();
  const [domain, setDomain] = useState("");
  const [skill, setSkill] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [shuffleOn, setShuffleOn] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const questions = useMemo(() => store.bank?.questions ?? [], [store.bank]);
  const domains = useMemo(() => unique(questions.map((q) => q.domain)), [questions]);
  const skills = useMemo(() => unique(questions.map((q) => q.skill)), [questions]);

  const matches = useMemo(
    () =>
      filterQuestions(
        questions,
        {
          ...DEFAULT_FILTERS,
          domains: domain ? [domain] : [],
          skills: skill ? [skill] : [],
          status,
        },
        store.attempts,
      ),
    [questions, domain, skill, status, store.attempts],
  );

  function start() {
    const ids = (shuffleOn ? shuffle(matches) : matches).map((q) => q.id);
    if (ids.length) setSession({ ids, idx: 0, answers: {} });
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!store.bank) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">Practice</h1>
        <Banner tone="blue" title="No bank loaded">
          Import a PDF (or the sample bank) first, then come back to drill it.
        </Banner>
        <Link href="/">
          <Button variant="primary">{Icons.upload({ size: 15 })} Go to import</Button>
        </Link>
      </div>
    );
  }

  const current = session ? questions.find((q) => q.id === session.ids[session.idx]) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          Practice
        </h1>
        <p className="measure text-[15px] leading-relaxed text-zinc-600">
          Answer with a click or the A–D keys. Every attempt is recorded against the question’s
          skill and domain.
        </p>
      </div>

      {!session ? (
        <section className="space-y-5 rounded-xl border border-zinc-200 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium text-zinc-700">Domain</span>
              <Select className="w-full" value={domain} onChange={(e) => setDomain(e.target.value)}>
                <option value="">All domains</option>
                {domains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium text-zinc-700">Skill</span>
              <Select className="w-full" value={skill} onChange={(e) => setSkill(e.target.value)}>
                <option value="">All skills</option>
                {skills.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium text-zinc-700">Status</span>
              <Select
                className="w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_FILTER_LABELS[s]}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={shuffleOn}
                onChange={(e) => setShuffleOn(e.target.checked)}
                className="size-4 rounded border-zinc-300 accent-zinc-900"
              />
              Shuffle order
              <span className="tabular-nums text-[13px] text-zinc-500">
                · {matches.length} of {questions.length} match
              </span>
            </label>
            <Button variant="primary" onClick={start} disabled={matches.length === 0}>
              Start session
              {Icons.arrowRight({ size: 15 })}
            </Button>
          </div>

          {matches.length === 0 ? (
            <p className="text-[13px] text-zinc-500">
              Nothing matches those filters yet — loosen the status or pick another skill.
            </p>
          ) : null}
        </section>
      ) : current ? (
        <QuestionView
          key={current.id}
          session={session}
          questionId={current.id}
          onAnswer={(choice) => {
            if (session.answers[current.id]) return;
            record(current.id, choice === current.answer, choice);
            setSession({
              ...session,
              answers: { ...session.answers, [current.id]: choice },
            });
          }}
          onNext={() => {
            if (session.idx + 1 < session.ids.length) {
              setSession({ ...session, idx: session.idx + 1 });
            } else {
              setSession({ ...session, idx: session.ids.length });
            }
          }}
        />
      ) : (
        <SessionSummary
          session={session}
          onRestart={start}
          onRetryMistakes={() => {
            const missed = session.ids.filter((id) => {
              const q = questions.find((x) => x.id === id);
              return q && session.answers[id] !== q.answer;
            });
            setSession({
              ids: shuffleOn ? shuffle(missed) : missed,
              idx: 0,
              answers: {},
            });
          }}
          onNew={() => setSession(null)}
        />
      )}
    </div>
  );
}

function QuestionView({
  session,
  questionId,
  onAnswer,
  onNext,
}: {
  session: Session;
  questionId: string;
  onAnswer: (choice: Choice) => void;
  onNext: () => void;
}) {
  const { store } = useStore();
  const question = store.bank?.questions.find((q) => q.id === questionId);
  const picked = question ? session.answers[question.id] : undefined;
  const answered = picked !== undefined;
  const isLast = session.idx + 1 >= session.ids.length;
  const tally = Object.entries(session.answers).reduce(
    (acc, [id, choice]) => {
      const q = store.bank?.questions.find((x) => x.id === id);
      if (q && choice === q.answer) acc.right += 1;
      else acc.wrong += 1;
      return acc;
    },
    { right: 0, wrong: 0 },
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (!answered) {
        const byLetter = CHOICE_LETTERS.find((l) => l.toLowerCase() === key);
        const byNumber = ["1", "2", "3", "4"].includes(key)
          ? CHOICE_LETTERS[Number(key) - 1]
          : undefined;
        const choice = byLetter ?? byNumber;
        if (choice) {
          e.preventDefault();
          onAnswer(choice);
        }
      } else if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, onAnswer, onNext]);

  if (!question) return null;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
          <span className="tabular-nums font-medium text-zinc-800">
            Question {session.idx + 1} of {session.ids.length}
          </span>
          <span className="tabular-nums text-zinc-500">
            <span className="text-emerald-700">{tally.right} right</span>
            {" · "}
            <span className="text-red-600">{tally.wrong} wrong</span>
          </span>
        </div>
        <ProgressBar value={(session.idx + (answered ? 1 : 0)) / session.ids.length} />
      </div>

      <article className="space-y-5">
        <header className="flex flex-wrap items-center gap-2">
          <Tag tone="blue">{question.domain}</Tag>
          <Tag>{question.skill}</Tag>
          <Tag tone={question.difficulty === "Hard" ? "amber" : "neutral"}>
            {question.difficulty}
          </Tag>
          <span className="tabular-nums ml-auto font-mono text-[12px] text-zinc-400">
            {question.id}
          </span>
        </header>

        <div className="measure space-y-4 text-[15px] leading-[1.75] text-zinc-900">
          {question.question.split("\n\n").map((para, i) => (
            <p key={i} className="whitespace-pre-line">
              {para}
            </p>
          ))}
        </div>

        <ul className="space-y-2.5">
          {CHOICE_LETTERS.map((letter) => {
            const isCorrect = letter === question.answer;
            const isPicked = picked === letter;
            const state = !answered
              ? "idle"
              : isCorrect
                ? "correct"
                : isPicked
                  ? "wrong"
                  : "dim";
            const styles = {
              idle: "border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50",
              correct: "border-emerald-500 bg-emerald-50",
              wrong: "border-red-500 bg-red-50",
              dim: "border-zinc-200 bg-white opacity-55",
            }[state];
            return (
              <li key={letter}>
                <button
                  type="button"
                  disabled={answered}
                  onClick={() => onAnswer(letter)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[15px] leading-relaxed transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-default ${styles}`}
                >
                  <span
                    className={`mt-px flex size-6 shrink-0 items-center justify-center rounded-md border text-[12px] font-semibold ${
                      state === "correct"
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : state === "wrong"
                          ? "border-red-500 bg-red-600 text-white"
                          : "border-zinc-300 bg-zinc-50 text-zinc-600"
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="whitespace-pre-line text-zinc-900">
                    {question.choices[letter]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </article>

      {answered ? (
        <div className="animate-rise space-y-4">
          <Banner
            tone={picked === question.answer ? "emerald" : "red"}
            title={
              picked === question.answer
                ? "Correct"
                : `Not quite — the answer is ${question.answer}`
            }
          >
            {question.choices[question.answer]}
          </Banner>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Explanation
            </p>
            <div className="measure mt-2 space-y-3 text-[14px] leading-relaxed text-zinc-800">
              {question.explanation.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="hidden text-[13px] text-zinc-500 sm:block">
              Press <kbd className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd>{" "}
              for the next question
            </span>
            <Button variant="primary" onClick={onNext}>
              {isLast ? "Finish session" : "Next question"}
              {Icons.arrowRight({ size: 15 })}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-zinc-500">
          Choose an answer — keys{" "}
          <kbd className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 font-mono text-[11px]">A</kbd>–
          <kbd className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 font-mono text-[11px]">D</kbd> or{" "}
          <kbd className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 font-mono text-[11px]">1</kbd>–
          <kbd className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 font-mono text-[11px]">4</kbd> work too.
        </p>
      )}
    </div>
  );
}

function SessionSummary({
  session,
  onRestart,
  onRetryMistakes,
  onNew,
}: {
  session: Session;
  onRestart: () => void;
  onRetryMistakes: () => void;
  onNew: () => void;
}) {
  const { store } = useStore();
  const questions = useMemo(() => store.bank?.questions ?? [], [store.bank]);
  const answeredIds = Object.keys(session.answers);
  const sessionQuestions = questions.filter((q) => answeredIds.includes(q.id));
  const right = sessionQuestions.filter((q) => session.answers[q.id] === q.answer);
  const missed = sessionQuestions.filter((q) => session.answers[q.id] !== q.answer);
  const skillTotals = new Map<string, { total: number; right: number }>();
  for (const q of sessionQuestions) {
    const entry = skillTotals.get(q.skill) ?? { total: 0, right: 0 };
    entry.total += 1;
    if (session.answers[q.id] === q.answer) entry.right += 1;
    skillTotals.set(q.skill, entry);
  }

  if (answeredIds.length === 0) {
    return (
      <section className="space-y-4">
        <p className="text-zinc-600">No questions were answered in that session.</p>
        <Button variant="primary" onClick={onNew}>
          Back to setup
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Session complete</h2>
        <p className="tabular-nums text-[15px] text-zinc-600">
          {right.length} of {sessionQuestions.length} correct ·{" "}
          {formatPct(right.length / sessionQuestions.length)}
        </p>
        <ProgressBar
          value={right.length / sessionQuestions.length}
          tone={right.length === sessionQuestions.length ? "emerald" : "blue"}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-950">By skill</h3>
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
            {[...skillTotals.entries()]
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([skillName, t]) => (
                <li key={skillName} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="truncate text-sm text-zinc-800">{skillName}</span>
                  <span className="tabular-nums text-[13px] text-zinc-600">
                    {t.right}/{t.total}
                  </span>
                </li>
              ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-950">
            Missed {missed.length ? `(${missed.length})` : ""}
          </h3>
          {missed.length ? (
            <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
              {missed.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="truncate text-sm text-zinc-800">{q.skill}</span>
                  <span className="font-mono text-[12px] text-zinc-400">{q.id}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Nothing missed — every answer in this session was right.
            </p>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onNew}>
          New session
        </Button>
        {missed.length ? (
          <Button onClick={onRetryMistakes}>{Icons.rotate({ size: 15 })} Retry mistakes</Button>
        ) : null}
        <Button variant="ghost" onClick={onRestart}>
          Same filters again
        </Button>
        <Link href="/bank">
          <Button variant="ghost">Browse the bank</Button>
        </Link>
      </div>
    </div>
  );
}
