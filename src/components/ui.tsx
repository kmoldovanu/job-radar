"use client";

import { SOURCE_LABELS, type SourceId } from "@/lib/types";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 pt-2">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Progress({ done, total, label }: { done: number; total: number; label?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-1.5" role="status" aria-live="polite">
      <div className="flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="tabular-nums">
          {done}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-signal transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function scoreColor(score: number) {
  return score >= 75 ? "#3fc1a0" : score >= 55 ? "#a6cf5e" : score >= 40 ? "#f4b740" : "#7a8ea2";
}

/** Punteggio come anello del radar: l'arco cresce con il match. */
export function ScoreRing({ score, ai }: { score: number; ai: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = scoreColor(score);
  return (
    <div className="relative size-14 shrink-0" title={ai ? `Punteggio AI: ${score}/100` : `Punteggio rapido (senza AI): ${score}/100`}>
      <svg viewBox="0 0 56 56" className="size-14 -rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#24374c" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[19px] font-bold leading-none tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="mt-0.5 text-[9px] font-medium leading-none text-muted">{ai ? "AI" : "rapido"}</span>
      </div>
      <span className="sr-only">{ai ? "Punteggio AI" : "Punteggio rapido"} {score} su 100</span>
    </div>
  );
}

/** Badge "Nuova" (mai aperta) o "Vista". */
export function SeenBadge({ seen }: { seen: boolean }) {
  if (seen)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-panel-2 px-2 py-0.5 text-[11px] font-medium text-muted">
        <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="M5 12.5 10 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Vista
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-signal/12 px-2 py-0.5 text-[11px] font-semibold text-signal">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-signal" />
        <span className="relative inline-flex size-1.5 rounded-full bg-signal" />
      </span>
      Nuova
    </span>
  );
}

export function Segmented<T extends string>({
  value, onChange, options, label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-panel p-1 [scrollbar-width:none]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`flex min-h-10 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm transition-colors ${on ? "bg-panel-2 font-semibold text-ink shadow-[inset_0_0_0_1px_#24374c]" : "text-muted hover:text-ink"}`}
          >
            {o.label}
            {o.count != null && <span className={`tabular-nums text-xs ${on ? "text-signal" : "text-slate-600"}`}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-9 shrink-0 rounded-full border px-3 text-[13px] transition-colors ${on ? "border-signal/60 bg-signal/10 text-signal" : "border-line text-muted hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

export function ViaSource({ source, url }: { source: string; url: string }) {
  const s = SOURCE_LABELS[source as SourceId];
  if (!s) return null;
  if (source === "manual") return <span className="text-xs text-muted">inserita a mano</span>;
  return (
    <span className="text-xs text-muted">
      via{" "}
      <a href={url || s.home} target="_blank" rel="noopener noreferrer" className="underline decoration-line underline-offset-2 hover:text-ink">
        {s.name}
      </a>
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">{children}</div>;
}

export function ErrorBox({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div role="alert" className="whitespace-pre-line rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-[#ffb3b1]">
      {error}
    </div>
  );
}

export function Toast({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 md:bottom-6" role="status" aria-live="polite">
      <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-panel-2 py-2 pr-2 pl-4 text-sm shadow-2xl shadow-black/40">
        <span>{message}</span>
        {action && (
          <button className="min-h-9 rounded-lg px-3 font-semibold text-signal hover:bg-panel" onClick={onAction}>
            {action}
          </button>
        )}
      </div>
    </div>
  );
}
