"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

type IconProps = { size?: number; className?: string };

function svg(path: ReactNode, { size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {path}
    </svg>
  );
}

export const Icons = {
  upload: (p: IconProps = {}) =>
    svg(
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </>,
      p,
    ),
  file: (p: IconProps = {}) =>
    svg(
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </>,
      p,
    ),
  layers: (p: IconProps = {}) =>
    svg(
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 13 9 5 9-5" />
      </>,
      p,
    ),
  list: (p: IconProps = {}) =>
    svg(
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3.5 6h.01" />
        <path d="M3.5 12h.01" />
        <path d="M3.5 18h.01" />
      </>,
      p,
    ),
  check: (p: IconProps = {}) => svg(<path d="m5 13 4 4L19 7" />, p),
  x: (p: IconProps = {}) =>
    svg(
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>,
      p,
    ),
  chevronDown: (p: IconProps = {}) => svg(<path d="m6 9 6 6 6-6" />, p),
  arrowRight: (p: IconProps = {}) =>
    svg(
      <>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </>,
      p,
    ),
  rotate: (p: IconProps = {}) =>
    svg(
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </>,
      p,
    ),
  search: (p: IconProps = {}) =>
    svg(
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>,
      p,
    ),
  alert: (p: IconProps = {}) =>
    svg(
      <>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </>,
      p,
    ),
  loader: (p: IconProps = {}) =>
    svg(
      <>
        <path d="M12 3v4" />
        <path d="M12 17v4" />
        <path d="M5 12H3" />
        <path d="M21 12h-2" />
        <path d="m6.3 6.3 1.5 1.5" />
        <path d="m16.2 16.2 1.5 1.5" />
        <path d="m17.7 6.3-1.5 1.5" />
        <path d="m7.8 16.2-1.5 1.5" />
      </>,
      p,
    ),
  trash: (p: IconProps = {}) =>
    svg(
      <>
        <path d="M4 7h16" />
        <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
      </>,
      p,
    ),
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-zinc-900 text-white border border-zinc-900 hover:bg-zinc-700 hover:border-zinc-700 active:bg-zinc-800",
  outline:
    "bg-white text-zinc-800 border border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 active:bg-zinc-100",
  ghost:
    "bg-transparent text-zinc-600 border border-transparent hover:bg-zinc-100 hover:text-zinc-900",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export function Button({
  variant = "outline",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && Icons.loader({ className: "animate-spin" })}
      {children}
    </button>
  );
}

export function Select({
  className = "",
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative inline-flex ${className}`}>
      <select
        className="h-9 w-full appearance-none rounded-lg border border-zinc-300 bg-white py-0 pl-3 pr-8 text-[13px] font-medium text-zinc-800 transition-colors hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        {...rest}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500">
        {Icons.chevronDown({ size: 14 })}
      </span>
    </div>
  );
}

export function Tag({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "blue" | "emerald" | "red" | "amber";
  className?: string;
}) {
  const tones = {
    neutral: "border-zinc-200 bg-zinc-50 text-zinc-600",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4 ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, tone = "blue" }: { value: number; tone?: "blue" | "emerald" | "red" }) {
  const bar = { blue: "bg-blue-600", emerald: "bg-emerald-600", red: "bg-red-500" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
      <div
        className={`h-full rounded-full ${bar} transition-[width] duration-500 ease-out`}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  );
}

export function Banner({
  tone,
  title,
  children,
}: {
  tone: "emerald" | "red" | "blue";
  title: string;
  children?: ReactNode;
}) {
  const styles = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
  }[tone];
  const icon =
    tone === "emerald"
      ? Icons.check({ className: "text-emerald-600" })
      : tone === "red"
        ? Icons.x({ className: "text-red-600" })
        : Icons.alert({ className: "text-blue-600" });
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${styles}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="text-sm">
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-1 leading-relaxed opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-200/70 ${className}`} />;
}
