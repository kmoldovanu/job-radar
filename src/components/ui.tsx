"use client";

import { SOURCE_LABELS, type SourceId } from "@/lib/types";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 pt-3 pb-1">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[34px]">{title}</h1>
        {subtitle && <div className="mt-2 text-[15px] text-muted">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

/** Riga di stato in mono con il pallino corallo, es. "● 4 DA VEDERE · 3 GIÀ VISTE". */
export function LiveLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="mono flex items-center gap-2 text-muted">
      <span className="size-1.5 shrink-0 rounded-full bg-signal" aria-hidden="true" />
      {children}
    </p>
  );
}

export function Progress({ done, total, label }: { done: number; total: number; label?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="mono flex justify-between text-muted">
        <span>{label}</span>
        <span className="tabular-nums">
          {done}/{total}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-signal transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Il match: "81% MATCH" in mono.
 * Valutato dall'AI = corallo pieno di testo; stima rapida dal CV (senza AI) = grigio.
 */
export function MatchTag({ score, ai }: { score: number; ai: boolean }) {
  const strong = ai && score >= 70;
  return (
    <span
      className={`mono inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 tabular-nums ${
        ai ? (strong ? "border-signal/40 bg-signal/[0.06] text-signal" : "border-line-strong text-ink") : "border-dashed border-line-strong text-muted"
      }`}
      title={ai ? `Punteggio AI: ${score}/100` : `Stima rapida dal CV (senza AI): ${score}/100`}
    >
      <span className="font-medium">{score}%</span>
      {ai ? "match" : "stima"}
    </span>
  );
}

/** "Nuova" (mai aperta) con il pallino corallo che pulsa, oppure "Vista". */
export function SeenBadge({ seen }: { seen: boolean }) {
  if (seen) return <span className="mono text-faint">Vista</span>;
  return (
    <span className="mono inline-flex items-center gap-1.5 text-signal">
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
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-full bg-panel-2 p-1 [scrollbar-width:none]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`flex min-h-9 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${on ? "bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_rgb(0_0_0/0.04)]" : "text-muted hover:text-ink"}`}
          >
            {o.label}
            {o.count != null && <span className={`font-mono text-xs tabular-nums ${on ? "text-signal" : "text-faint"}`}>{o.count}</span>}
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
      className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors duration-150 ${on ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-slate-300 hover:border-[#c4c4c2] hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

export function ViaSource({ source, url }: { source: string; url: string }) {
  const s = SOURCE_LABELS[source as SourceId];
  if (!s) return null;
  if (source === "manual") return <span className="mono text-faint">a mano</span>;
  return (
    <span className="mono text-faint">
      via{" "}
      <a href={url || s.home} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink">
        {s.name}
      </a>
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center text-[15px] leading-relaxed text-muted">{children}</div>;
}

export function ErrorBox({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div role="alert" className="whitespace-pre-line rounded-xl border border-[#f5c2bb] bg-[#fdf3f1] p-3 text-sm text-[#9f2412]">
      {error}
    </div>
  );
}

export function Toast({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 md:bottom-6" role="status" aria-live="polite">
      <div className="pointer-events-auto flex max-w-md animate-rise items-center gap-3 rounded-full bg-ink py-1.5 pr-1.5 pl-4 text-sm font-medium text-white shadow-[0_12px_32px_-8px_rgb(0_0_0/0.35)]">
        <span>{message}</span>
        {action && (
          <button className="min-h-8 rounded-full px-3 font-medium text-[#ff8a70] hover:bg-white/10" onClick={onAction}>
            {action}
          </button>
        )}
      </div>
    </div>
  );
}
