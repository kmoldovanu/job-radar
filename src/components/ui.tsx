"use client";

import { SOURCE_LABELS, type SourceId } from "@/lib/types";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 pt-2 pb-1">
      <div className="min-w-0">
        <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-[-0.025em]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
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
        <div className="h-full rounded-full bg-signal transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Colore di linea per un punteggio: verde = adatta, ambra = da valutare bene, grigio = lontana. */
export function scoreColor(score: number) {
  return score >= 70 ? "var(--color-good)" : score >= 45 ? "var(--color-signal)" : "var(--color-faint)";
}

/**
 * Punteggio come badge di una linea della metro.
 * Pieno = valutato dall'AI; contorno = stima rapida dal CV (parole chiave, senza AI).
 */
export function LineBadge({ score, ai, size = "md" }: { score: number; ai: boolean; size?: "md" | "sm" }) {
  const color = scoreColor(score);
  const dim = size === "sm" ? "size-10 text-[17px] rounded-[9px]" : "size-[52px] text-[22px] rounded-[12px]";
  return (
    <div className="flex shrink-0 flex-col items-center gap-1" title={ai ? `Punteggio AI: ${score}/100` : `Stima rapida dal CV (senza AI): ${score}/100`}>
      <div
        className={`flex items-center justify-center font-extrabold leading-none tabular-nums ${dim}`}
        style={ai ? { background: color, color: "var(--color-night)" } : { boxShadow: `inset 0 0 0 2.5px ${color}`, color }}
      >
        <span className="translate-y-[1px]">{score}</span>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-faint">{ai ? "AI" : "stima"}</span>
      <span className="sr-only">{ai ? "Punteggio AI" : "Stima rapida"} {score} su 100</span>
    </div>
  );
}

/**
 * La linea con le fermate: il percorso di una candidatura (o di qualsiasi sequenza).
 * Le fermate fino a `at` sono raggiunte e prendono il colore della linea; con `stopped` la corsa si è fermata lì.
 */
export function StationLine({
  stops, at, color, stopped = false, compact = false,
}: {
  stops: string[];
  at: number;
  color: string;
  stopped?: boolean;
  compact?: boolean;
}) {
  const pct = stops.length > 1 ? (Math.max(0, at) / (stops.length - 1)) * 100 : 0;
  return (
    <div className={compact ? "pt-1" : "pt-2"}>
      <div className="relative mx-2.5 h-3">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-line-strong" />
        <div
          className="absolute left-0 top-1/2 h-[3px] origin-left -translate-y-1/2 animate-fill rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
        {stops.map((s, i) => {
          const reached = i <= at;
          const current = i === at;
          return (
            <span
              key={s}
              className="absolute top-1/2 grid size-3 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
              style={{
                left: `${stops.length > 1 ? (i / (stops.length - 1)) * 100 : 0}%`,
                background: reached ? (current ? "var(--color-night)" : color) : "var(--color-panel)",
                boxShadow: `0 0 0 ${current ? 3 : 2}px ${reached ? color : "var(--color-line-strong)"}`,
              }}
            >
              {current && stopped && (
                <svg viewBox="0 0 12 12" className="size-2" aria-hidden="true">
                  <path d="M3 3l6 6M9 3l-6 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </span>
          );
        })}
      </div>
      {!compact && (
        <ol className="relative mx-2.5 mt-2 h-4 text-[11px] font-semibold">
          {stops.map((s, i) => {
            const last = i === stops.length - 1;
            const left = stops.length > 1 ? (i / (stops.length - 1)) * 100 : 0;
            return (
              <li
                key={s}
                className={`absolute top-0 whitespace-nowrap ${i <= at ? "text-ink" : "text-faint"}`}
                style={{ left: `${left}%`, transform: i === 0 ? "translateX(-10px)" : last ? "translateX(calc(-100% + 10px))" : "translateX(-50%)" }}
                aria-current={i === at ? "step" : undefined}
              >
                {s}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Badge "Nuova" (mai aperta) o "Vista". */
export function SeenBadge({ seen }: { seen: boolean }) {
  if (seen)
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-panel-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
        <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="M5 12.5 10 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Vista
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-signal/15 px-2 py-0.5 text-[11px] font-bold text-signal">
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
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-[12px] bg-rail p-1 [scrollbar-width:none]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`flex min-h-10 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-sm font-semibold transition-colors duration-150 ${on ? "bg-panel-2 text-ink shadow-[0_1px_2px_rgb(0_0_0/0.35)]" : "text-muted hover:text-ink"}`}
          >
            {o.label}
            {o.count != null && (
              <span className={`min-w-5 rounded-[5px] px-1 text-center text-xs tabular-nums ${on ? "bg-signal text-night" : "bg-panel-2 text-muted"}`}>{o.count}</span>
            )}
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
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[9px] border px-3 text-[13px] font-semibold transition-colors duration-150 ${on ? "border-ink bg-ink text-night" : "border-line-strong text-muted hover:border-faint hover:text-ink"}`}
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
  return <div className="rounded-[14px] border border-dashed border-line-strong px-6 py-8 text-center text-[15px] leading-relaxed text-muted">{children}</div>;
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
      <div className="pointer-events-auto flex max-w-md animate-rise items-center gap-3 rounded-[12px] bg-ink py-2 pr-2 pl-4 text-sm font-semibold text-night shadow-[0_10px_30px_rgb(0_0_0/0.45)]">
        <span>{message}</span>
        {action && (
          <button className="min-h-9 rounded-[8px] px-3 font-bold text-[#8a5a00] hover:bg-black/5" onClick={onAction}>
            {action}
          </button>
        )}
      </div>
    </div>
  );
}
