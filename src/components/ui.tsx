"use client";

import { animate, m, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId } from "react";
import { SOURCE_LABELS, type SourceId } from "@/lib/types";
import { easeOut, spring } from "./motion";

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

/** Colore del match: corallo = forte (AI ≥ 70), chiaro = da leggere bene, grigio = lontano o solo stima. */
export function matchColor(score: number, ai: boolean) {
  if (!ai) return "var(--color-muted)";
  return score >= 70 ? "var(--color-signal)" : score >= 45 ? "var(--color-ink)" : "var(--color-faint)";
}

/** Numero che sale fino al valore (una volta, quando compare). */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const shown = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    const c = animate(mv, value, { duration: reduce ? 0 : 0.9, ease: easeOut });
    return () => c.stop();
  }, [mv, value, reduce]);
  return <m.span className={className}>{shown}</m.span>;
}

/** Barra sottile che si riempie fino a `pct`. */
export function Meter({ pct, color, className = "h-1" }: { pct: number; color: string; className?: string }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-line ${className}`}>
      <m.div
        className="h-full origin-left rounded-full"
        style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, ease: easeOut }}
      />
    </div>
  );
}

/**
 * Il match, grande e chiaro: "81%" con la barra e cosa è.
 * Valutato dall'AI = "Match AI" (corallo se forte); senza AI = "Stima CV", in grigio.
 */
export function MatchMeter({ score, ai }: { score: number; ai: boolean }) {
  const color = matchColor(score, ai);
  return (
    <div
      className="flex w-[72px] shrink-0 flex-col items-end gap-1.5 text-right sm:w-20"
      title={ai ? `Valutazione AI: ${score} su 100` : `Stima rapida dal tuo CV, senza AI: ${score} su 100`}
    >
      <div className="flex items-baseline font-semibold leading-none tracking-[-0.04em] tabular-nums" style={{ color }} aria-hidden="true">
        <CountUp value={score} className="text-[30px] sm:text-[34px]" />
        <span className="ml-px text-[15px] tracking-normal">%</span>
      </div>
      <Meter pct={score} color={color} />
      <span className="mono whitespace-nowrap text-faint" aria-hidden="true">{ai ? "Match AI" : "Stima CV"}</span>
      <span className="sr-only">{ai ? `Match AI ${score}%` : `Stima dal CV ${score}%`}</span>
    </div>
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
  const group = useId();
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
            className={`relative flex min-h-9 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors duration-150 ${on ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {on && (
              <m.span
                layoutId={`seg-${group}`}
                className="absolute inset-0 rounded-full bg-line-strong shadow-[0_1px_2px_rgb(0_0_0/0.5)]"
                transition={spring}
                aria-hidden="true"
              />
            )}
            <span className="relative">{o.label}</span>
            {o.count != null && <span className={`relative font-mono text-xs tabular-nums ${on ? "text-signal" : "text-faint"}`}>{o.count}</span>}
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
      className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors duration-150 ${on ? "border-ink bg-ink text-night" : "border-line-strong bg-panel text-slate-300 hover:border-hover hover:text-ink"}`}
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
    <div role="alert" className="whitespace-pre-line rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-[#fecaca]">
      {error}
    </div>
  );
}

export function Toast({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 md:bottom-6" role="status" aria-live="polite">
      <m.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
        transition={spring}
        className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-ink py-1.5 pr-1.5 pl-4 text-sm font-medium text-night shadow-[0_12px_32px_-8px_rgb(0_0_0/0.35)]">
        <span>{message}</span>
        {action && (
          <button className="min-h-8 rounded-full px-3 font-medium text-[#c02f17] hover:bg-black/5" onClick={onAction}>
            {action}
          </button>
        )}
      </m.div>
    </div>
  );
}
