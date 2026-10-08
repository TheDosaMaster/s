export type Choice = "A" | "B" | "C" | "D";

export type Question = {
  id: string;
  assessment: string;
  test: string;
  domain: string;
  skill: string;
  difficulty: string;
  question: string;
  choices: Record<Choice, string>;
  answer: Choice;
  explanation: string;
};

export type Attempt = {
  correct: number;
  wrong: number;
  last: "correct" | "wrong" | null;
  lastPick: Choice | null;
  lastAt: number | null;
};

export type Bank = {
  questions: Question[];
  source: string;
  importedAt: number;
};

export type Store = {
  bank: Bank | null;
  attempts: Record<string, Attempt>;
};

export type Status = "unseen" | "correct" | "wrong" | "mixed";

export const STORAGE_KEY = "sat-question-bank/v1";

export const CHOICE_LETTERS: Choice[] = ["A", "B", "C", "D"];

export function isChoice(v: unknown): v is Choice {
  return v === "A" || v === "B" || v === "C" || v === "D";
}

export function isQuestion(v: unknown): v is Question {
  if (!v || typeof v !== "object") return false;
  const q = v as Partial<Question>;
  return (
    typeof q.id === "string" &&
    typeof q.question === "string" &&
    typeof q.explanation === "string" &&
    isChoice(q.answer) &&
    !!q.choices &&
    CHOICE_LETTERS.every((l) => typeof q.choices?.[l] === "string") &&
    typeof q.domain === "string" &&
    typeof q.skill === "string"
  );
}

export function loadStore(): Store {
  if (typeof window === "undefined") return { bank: null, attempts: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { bank: null, attempts: {} };
    const parsed = JSON.parse(raw) as Partial<Store>;
    const bank =
      parsed.bank && Array.isArray(parsed.bank.questions)
        ? {
            questions: parsed.bank.questions.filter(isQuestion),
            source: typeof parsed.bank.source === "string" ? parsed.bank.source : "bank.json",
            importedAt:
              typeof parsed.bank.importedAt === "number"
                ? parsed.bank.importedAt
                : Date.now(),
          }
        : null;
    const attempts: Record<string, Attempt> = {};
    if (parsed.attempts && typeof parsed.attempts === "object") {
      for (const [id, a] of Object.entries(parsed.attempts)) {
        const rec = a as Partial<Attempt>;
        if (typeof rec.correct === "number" && typeof rec.wrong === "number") {
          attempts[id] = {
            correct: rec.correct,
            wrong: rec.wrong,
            last: rec.last === "correct" || rec.last === "wrong" ? rec.last : null,
            lastPick: isChoice(rec.lastPick) ? rec.lastPick : null,
            lastAt: typeof rec.lastAt === "number" ? rec.lastAt : null,
          };
        }
      }
    }
    return { bank, attempts };
  } catch {
    return { bank: null, attempts: {} };
  }
}

export function saveStore(store: Store) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full or unavailable — practice still works in-session
  }
}

export function statusOf(a?: Attempt): Status {
  if (!a || a.correct + a.wrong === 0) return "unseen";
  if (a.wrong === 0) return "correct";
  if (a.correct === 0) return "wrong";
  return "mixed";
}

export function accuracy(a?: Attempt): number | null {
  if (!a || a.correct + a.wrong === 0) return null;
  return a.correct / (a.correct + a.wrong);
}

export function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type StatusFilter = "all" | "unseen" | "mistakes" | "mastered" | "seen";

export type FilterState = {
  domains: string[];
  skills: string[];
  status: StatusFilter;
  search: string;
};

export const DEFAULT_FILTERS: FilterState = {
  domains: [],
  skills: [],
  status: "all",
  search: "",
};

export function matchesStatus(a: Attempt | undefined, status: StatusFilter): boolean {
  const s = statusOf(a);
  switch (status) {
    case "all":
      return true;
    case "unseen":
      return s === "unseen";
    case "seen":
      return s !== "unseen";
    case "mistakes":
      return !!a && a.wrong > 0;
    case "mastered":
      return !!a && a.correct > 0 && a.wrong === 0;
  }
}

export function filterQuestions(
  questions: Question[],
  filters: FilterState,
  attempts: Record<string, Attempt>,
): Question[] {
  const search = filters.search.trim().toLowerCase();
  return questions.filter((q) => {
    if (filters.domains.length && !filters.domains.includes(q.domain)) return false;
    if (filters.skills.length && !filters.skills.includes(q.skill)) return false;
    if (!matchesStatus(attempts[q.id], filters.status)) return false;
    if (search) {
      const hay = `${q.id} ${q.domain} ${q.skill} ${q.question}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

export type SortKey = "skill" | "domain" | "difficulty" | "accuracy" | "attempts" | "id";

export const SORT_LABELS: Record<SortKey, string> = {
  skill: "Skill",
  domain: "Domain",
  difficulty: "Difficulty",
  accuracy: "Accuracy",
  attempts: "Attempts",
  id: "Question ID",
};

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All questions",
  unseen: "Unseen",
  seen: "Seen at least once",
  mistakes: "Has mistakes",
  mastered: "Mastered",
};

export type QuestionGroup = { label: string; rows: Question[] };

export function groupAndSort(
  questions: Question[],
  sort: SortKey,
  attempts: Record<string, Attempt>,
): QuestionGroup[] {
  const byKey = (q: Question) => (sort === "id" || sort === "accuracy" || sort === "attempts" ? "" : q[sort]);
  const cmp = (a: Question, b: Question): number => {
    switch (sort) {
      case "accuracy": {
        const aa = accuracy(attempts[a.id]) ?? -1;
        const ab = accuracy(attempts[b.id]) ?? -1;
        if (aa !== ab) return ab - aa;
        break;
      }
      case "attempts": {
        const ta = attempts[a.id];
        const tb = attempts[b.id];
        const na = ta ? ta.correct + ta.wrong : -1;
        const nb = tb ? tb.correct + tb.wrong : -1;
        if (na !== nb) return nb - na;
        break;
      }
      case "difficulty":
        return a.difficulty.localeCompare(b.difficulty) || a.id.localeCompare(b.id);
      case "id":
        return a.id.localeCompare(b.id);
      default: {
        const v = a[sort].localeCompare(b[sort]);
        if (v !== 0) return v;
      }
    }
    return a.id.localeCompare(b.id);
  };

  const sorted = [...questions].sort(cmp);
  const grouped = sort === "skill" || sort === "domain";
  if (!grouped) return [{ label: "", rows: sorted }];

  const map = new Map<string, Question[]>();
  for (const q of sorted) {
    const label = byKey(q);
    const bucket = map.get(label);
    if (bucket) bucket.push(q);
    else map.set(label, [q]);
  }
  return [...map.entries()].map(([label, rows]) => ({ label, rows }));
}

export type DimensionStat = {
  key: string;
  total: number;
  seen: number;
  correct: number;
  wrong: number;
  accuracy: number | null;
};

export function dimensionStats(
  questions: Question[],
  attempts: Record<string, Attempt>,
  pick: (q: Question) => string,
): DimensionStat[] {
  const map = new Map<string, DimensionStat>();
  for (const q of questions) {
    const key = pick(q);
    const stat = map.get(key) ?? {
      key,
      total: 0,
      seen: 0,
      correct: 0,
      wrong: 0,
      accuracy: null,
    };
    stat.total += 1;
    const a = attempts[q.id];
    if (a && a.correct + a.wrong > 0) {
      stat.seen += 1;
      stat.correct += a.correct;
      stat.wrong += a.wrong;
    }
    map.set(key, stat);
  }
  for (const stat of map.values()) {
    const denom = stat.correct + stat.wrong;
    stat.accuracy = denom ? stat.correct / denom : null;
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function overallStats(questions: Question[], attempts: Record<string, Attempt>) {
  let seen = 0;
  let correct = 0;
  let wrong = 0;
  for (const q of questions) {
    const a = attempts[q.id];
    if (a && a.correct + a.wrong > 0) {
      seen += 1;
      correct += a.correct;
      wrong += a.wrong;
    }
  }
  const denom = correct + wrong;
  return { seen, correct, wrong, total: questions.length, accuracy: denom ? correct / denom : null };
}

export function formatPct(n: number | null): string {
  return n === null ? "—" : `${Math.round(n * 100)}%`;
}
