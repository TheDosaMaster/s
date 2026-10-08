"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { StoreProvider, useStore } from "@/components/store";
import { formatPct, overallStats } from "@/lib/bank";

const TABS = [
  { href: "/", label: "Import" },
  { href: "/practice", label: "Practice" },
  { href: "/bank", label: "Bank" },
] as const;

function BankStatus() {
  const { hydrated, store } = useStore();
  if (!hydrated) return <div className="h-5 w-40" />;
  if (!store.bank) {
    return (
      <span className="text-[13px] text-zinc-500">No bank loaded</span>
    );
  }
  const stats = overallStats(store.bank.questions, store.attempts);
  return (
    <span className="hidden items-baseline gap-3 text-[13px] text-zinc-500 sm:flex">
      <span className="tabular-nums text-zinc-800">{stats.total} questions</span>
      <span className="tabular-nums">
        {stats.seen} seen · {formatPct(stats.accuracy)} right
      </span>
    </span>
  );
}

function TopBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          SAT Question Bank
        </Link>
        <nav aria-label="Primary" className="flex h-full items-stretch gap-1">
          {TABS.map((tab) => {
            const active =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  active ? "text-zinc-950" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {tab.label}
                <span
                  className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-opacity ${
                    active ? "bg-blue-600 opacity-100" : "opacity-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>
        <BankStatus />
      </div>
    </header>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-zinc-200">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 text-[12px] text-zinc-500 sm:px-8">
            <span>Local only — your bank and progress stay in this browser.</span>
            <span className="tabular-nums">pdf → json → drill</span>
          </div>
        </footer>
      </div>
    </StoreProvider>
  );
}
