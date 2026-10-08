"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  loadStore,
  saveStore,
  type Attempt,
  type Choice,
  type Question,
  type Store,
} from "@/lib/bank";

type Snapshot = { hydrated: boolean; store: Store };

type StoreContextValue = Snapshot & {
  importBank: (questions: Question[], source: string) => void;
  record: (id: string, correct: boolean, pick: Choice) => void;
  resetAttempts: () => void;
  clearBank: () => void;
};

const EMPTY: Store = { bank: null, attempts: {} };
const SERVER_SNAPSHOT: Snapshot = { hydrated: false, store: EMPTY };

let store: Store = EMPTY;
let hydrated = false;
let snapshot: Snapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function loadOnce() {
  if (hydrated || typeof window === "undefined") return;
  store = loadStore();
  hydrated = true;
  snapshot = { hydrated: true, store };
}

function commit(next: Store) {
  store = next;
  snapshot = { hydrated: true, store: next };
  saveStore(next);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Snapshot {
  loadOnce();
  return snapshot;
}

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

function importBank(questions: Question[], source: string) {
  commit({ bank: { questions, source, importedAt: Date.now() }, attempts: store.attempts });
}

function record(id: string, correct: boolean, pick: Choice) {
  const prev: Attempt = store.attempts[id] ?? {
    correct: 0,
    wrong: 0,
    last: null,
    lastPick: null,
    lastAt: null,
  };
  const next: Attempt = {
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    last: correct ? "correct" : "wrong",
    lastPick: pick,
    lastAt: Date.now(),
  };
  commit({ ...store, attempts: { ...store.attempts, [id]: next } });
}

function resetAttempts() {
  commit({ ...store, attempts: {} });
}

function clearBank() {
  commit({ bank: null, attempts: {} });
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value = useMemo<StoreContextValue>(
    () => ({ ...snap, importBank, record, resetAttempts, clearBank }),
    [snap],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
