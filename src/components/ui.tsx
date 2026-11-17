"use client";

import { SOURCE_LABELS, type SourceId } from "@/lib/types";

export function Progress({ done, total, label }: { done: number; total: number; label?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>
          {done}/{total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ScoreBadge({ score, ai }: { score: number; ai: boolean }) {
  const color =
    score >= 75 ? "bg-emerald-600" : score >= 55 ? "bg-lime-600" : score >= 40 ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-white ${color}`} title={ai ? "Punteggio AI" : "Punteggio rapido"}>
      <span className="text-lg font-bold leading-none">{score}</span>
      <span className="text-[9px] uppercase opacity-90">{ai ? "AI" : "rapido"}</span>
    </div>
  );
}

export function ViaSource({ source, url }: { source: string; url: string }) {
  const s = SOURCE_LABELS[source as SourceId];
  if (!s) return null;
  if (source === "manual") return <span className="text-xs text-slate-500">inserita a mano</span>;
  return (
    <span className="text-xs text-slate-500">
      via{" "}
      <a href={url || s.home} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-600">
        {s.name}
      </a>
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card text-center text-sm text-slate-500">{children}</div>;
}

export function ErrorBox({ error }: { error: string }) {
  if (!error) return null;
  return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</div>;
}
