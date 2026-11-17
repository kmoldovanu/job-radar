"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Empty, ErrorBox, Progress, ScoreBadge, ViaSource } from "@/components/ui";
import { api, daysAgo } from "@/lib/client";
import { runQueue } from "@/lib/queue";
import type { AiEvaluation, MatchDetails, TailoredCv } from "@/lib/types";

interface JobRow {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  url: string;
  sourceUrl: string;
  postedAt: string | null;
  salary: string | null;
  quickScore: number;
  aiScore: number | null;
  aiEval: AiEvaluation | null;
  match: MatchDetails | null;
  hasTailored: boolean;
}

interface Tailored {
  id: number;
  language: string;
  cv: TailoredCv;
  letter: string;
  corrections: string[];
  model: string;
  createdAt: string;
}

const MODE: Record<string, string> = { remote: "🌍 Remoto", hybrid: "🏢 Ibrido", onsite: "📍 In sede", unknown: "" };

export default function OffersPage() {
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [error, setError] = useState("");
  const [prepareN, setPrepareN] = useState(5);
  const [batch, setBatch] = useState<{ label: string; done: number; total: number } | null>(null);
  const [batchErrors, setBatchErrors] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "ready" | "alta">("all");

  const load = useCallback(async () => {
    try {
      const [{ jobs }, s] = await Promise.all([
        api<{ jobs: JobRow[] }>("/api/jobs"),
        api<{ settings: { prepareCount: number } }>("/api/settings"),
      ]);
      setJobs(jobs);
      setPrepareN(s.settings.prepareCount);
    } catch (e) {
      setError((e as Error).message);
      setJobs([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    if (!jobs) return [];
    if (filter === "ready") return jobs.filter((j) => j.hasTailored);
    if (filter === "alta") return jobs.filter((j) => j.aiEval?.chance === "alta");
    return jobs;
  }, [jobs, filter]);

  async function prepareBatch() {
    if (!jobs) return;
    const targets = jobs.filter((j) => !j.hasTailored).slice(0, prepareN);
    if (!targets.length) return;
    setBatchErrors([]);
    setBatch({ label: "Preparo CV e lettere su misura", done: 0, total: targets.length });
    await runQueue(
      targets,
      3,
      async (j) => {
        // se manca la valutazione AI la facciamo prima (serve per lingua e parole chiave)
        if (!j.aiEval) await api(`/api/jobs/${encodeURIComponent(j.id)}/evaluate`, { method: "POST" }).catch(() => {});
        await api(`/api/jobs/${encodeURIComponent(j.id)}/tailor`, { method: "POST" });
      },
      (done, total, res, j) => {
        setBatch({ label: "Preparo CV e lettere su misura", done, total });
        if (res.status === "rejected") setBatchErrors((e) => [...e, `${j.company}: ${(res.reason as Error).message}`]);
        else setJobs((list) => list?.map((x) => (x.id === j.id ? { ...x, hasTailored: true } : x)) ?? null);
      },
    );
    setBatch(null);
    load();
  }

  async function evaluateBatch() {
    const { ids, ai } = await api<{ ids: string[]; ai: boolean }>("/api/jobs/pending-eval");
    if (!ai) return setError("Valutazione AI non disponibile: imposta ANTHROPIC_API_KEY");
    if (!ids.length) return;
    setBatch({ label: "Valutazione AI", done: 0, total: ids.length });
    await runQueue(ids, 4, (id) => api(`/api/jobs/${encodeURIComponent(id)}/evaluate`, { method: "POST" }), (done, total) =>
      setBatch({ label: "Valutazione AI", done, total }),
    );
    setBatch(null);
    load();
  }

  const remove = (id: string) => setJobs((l) => l?.filter((j) => j.id !== id) ?? null);
  const notTailored = jobs?.filter((j) => !j.hasTailored).length ?? 0;
  const notEvaluated = jobs?.filter((j) => !j.aiEval).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Offerte</h1>
          <p className="text-sm text-slate-500">{jobs ? `${jobs.length} offerte da valutare` : "Caricamento…"}</p>
        </div>
        <Link href="/cerca" className="btn-secondary">
          🔎 Cerca ora
        </Link>
      </div>

      <ErrorBox error={error} />

      {jobs && jobs.length > 0 && (
        <div className="card space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm" htmlFor="n">
              Prepara
            </label>
            <input
              id="n"
              type="number"
              min={1}
              max={30}
              value={prepareN}
              onChange={(e) => setPrepareN(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
              className="input w-16 py-1.5"
            />
            <button className="btn-primary" disabled={!!batch || !notTailored} onClick={prepareBatch}>
              ✨ Prepara {Math.min(prepareN, notTailored)} candidature
            </button>
            {notEvaluated > 0 && (
              <button className="btn-ghost" disabled={!!batch} onClick={evaluateBatch}>
                🤖 Valuta con AI
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Genera in blocco CV + lettera su misura per le migliori offerte ancora senza CV (3 alla volta).
          </p>
          {batch && <Progress {...batch} />}
          {batchErrors.length > 0 && <ErrorBox error={batchErrors.join("\n")} />}
          <div className="flex gap-1 text-sm">
            {(
              [
                ["all", "Tutte"],
                ["alta", "Chance alta"],
                ["ready", "CV pronto"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 ${filter === k ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {jobs && jobs.length === 0 && !error && (
        <Empty>
          Nessuna offerta per ora. Completa il <Link className="underline" href="/profilo">profilo</Link> e poi{" "}
          <Link className="underline" href="/cerca">avvia una ricerca</Link>.
        </Empty>
      )}

      <div className="space-y-3">
        {visible.map((j) => (
          <JobCard key={j.id} job={j} onRemove={remove} onChange={load} />
        ))}
      </div>
    </div>
  );
}

function JobCard({ job, onRemove, onChange }: { job: JobRow; onRemove: (id: string) => void; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<{ job: { description: string }; tailored: Tailored | null } | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const score = job.aiScore ?? job.quickScore;
  const idEnc = encodeURIComponent(job.id);

  async function loadDetail() {
    setDetail(await api(`/api/jobs/${idEnc}`));
  }

  async function toggle() {
    setOpen(!open);
    if (!open && !detail) loadDetail().catch((e) => setErr(e.message));
  }

  async function act(kind: "apply" | "dismiss" | "tailor" | "evaluate") {
    setBusy(kind);
    setErr("");
    try {
      if (kind === "tailor" && !job.aiEval) await api(`/api/jobs/${idEnc}/evaluate`, { method: "POST" }).catch(() => {});
      await api(`/api/jobs/${idEnc}/${kind}`, { method: "POST" });
      if (kind === "apply" || kind === "dismiss") onRemove(job.id);
      else {
        await loadDetail();
        setOpen(true);
        onChange();
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  const t = detail?.tailored;
  const dl = (doc: string, format: string) => `/api/jobs/${idEnc}/download?doc=${doc}&format=${format}`;

  return (
    <article className="card space-y-3">
      <div className="flex gap-3">
        <ScoreBadge score={score} ai={job.aiScore != null} />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold leading-snug">{job.title}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {MODE[job.workMode] && <span className="chip">{MODE[job.workMode]}</span>}
            {job.aiEval && <span className="chip">chance {job.aiEval.chance}</span>}
            {job.salary && <span className="chip">💶 {job.salary}</span>}
            {job.postedAt && <span className="text-xs text-slate-500">{daysAgo(job.postedAt)}</span>}
            <ViaSource source={job.source} url={job.sourceUrl} />
          </div>
        </div>
      </div>

      {job.aiEval?.summary && <p className="text-sm text-slate-700 dark:text-slate-300">{job.aiEval.summary}</p>}
      {!job.aiEval && job.match?.notes.length ? <p className="text-xs text-amber-700">{job.match.notes.join(" · ")}</p> : null}

      <div className="flex flex-wrap gap-2">
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
          ↗ Apri annuncio
        </a>
        {job.hasTailored || t ? (
          <>
            <a className="btn-secondary" href={dl("cv", "pdf")}>⬇ CV PDF</a>
            <a className="btn-secondary" href={dl("cv", "docx")}>CV Word</a>
            <a className="btn-secondary" href={dl("letter", "pdf")}>⬇ Lettera PDF</a>
            <a className="btn-secondary" href={dl("letter", "docx")}>Lettera Word</a>
          </>
        ) : (
          <button className="btn-secondary" disabled={!!busy} onClick={() => act("tailor")}>
            {busy === "tailor" ? "Preparo…" : "✨ Prepara CV"}
          </button>
        )}
        <button className="btn-success" disabled={!!busy} onClick={() => act("apply")}>
          ✅ Candidato!
        </button>
        <button className="btn-ghost" disabled={!!busy} onClick={() => act("dismiss")}>
          Non mi interessa
        </button>
        <button className="btn-ghost ml-auto" onClick={toggle}>
          {open ? "Chiudi ▲" : "Dettagli ▼"}
        </button>
      </div>
      <ErrorBox error={err} />

      {open && (
        <div className="space-y-4 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
          {job.aiEval && (
            <div className="grid gap-3 sm:grid-cols-3">
              <List title="Punti di forza" items={job.aiEval.strengths} tone="text-emerald-700 dark:text-emerald-400" />
              <List title="Cosa manca" items={job.aiEval.gaps} tone="text-amber-700 dark:text-amber-400" />
              <List title="Ostacoli" items={job.aiEval.obstacles} tone="text-red-700 dark:text-red-400" />
            </div>
          )}
          {!job.aiEval && (
            <button className="btn-ghost" disabled={!!busy} onClick={() => act("evaluate")}>
              {busy === "evaluate" ? "Valuto…" : "🤖 Valuta con AI"}
            </button>
          )}
          {job.match && (
            <p className="text-xs text-slate-500">
              Match rapido {job.match.score}/100 · titolo {job.match.titleScore}% · competenze trovate:{" "}
              {job.match.skillsFound.join(", ") || "nessuna"}
              {job.match.yearsRequired != null ? ` · richiede ${job.match.yearsRequired}+ anni` : ""}
              {job.match.notes.length ? ` · ${job.match.notes.join(" · ")}` : ""}
            </p>
          )}

          {t && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  CV su misura ({t.language.toUpperCase()}) — {t.cv.headline}
                </h3>
                <button className="btn-ghost text-xs" disabled={!!busy} onClick={() => act("tailor")}>
                  {busy === "tailor" ? "…" : "↻ Rigenera"}
                </button>
              </div>
              {t.corrections.length > 0 ? (
                <details className="text-xs">
                  <summary className="cursor-pointer text-amber-700 dark:text-amber-400">
                    🛡️ {t.corrections.length} correzioni anti-invenzione applicate
                  </summary>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600 dark:text-slate-400">
                    {t.corrections.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </details>
              ) : (
                <p className="text-xs text-emerald-700">🛡️ Controllo anti-invenzione: nessuna correzione necessaria</p>
              )}
              <LetterBox letter={t.letter} />
            </div>
          )}

          {detail ? (
            <details>
              <summary className="cursor-pointer font-semibold">Testo dell&apos;annuncio</summary>
              <p className="mt-2 whitespace-pre-line text-slate-700 dark:text-slate-300">{detail.job.description}</p>
            </details>
          ) : (
            <p className="text-slate-400">Caricamento…</p>
          )}
        </div>
      )}
    </article>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div>
      <h4 className={`mb-1 text-xs font-semibold uppercase ${tone}`}>{title}</h4>
      {items.length ? (
        <ul className="list-disc space-y-0.5 pl-4">
          {items.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-400">—</p>
      )}
    </div>
  );
}

function LetterBox({ letter }: { letter: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-500">Lettera</span>
        <button
          className="btn-ghost text-xs"
          onClick={async () => {
            await navigator.clipboard.writeText(letter);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copiata ✓" : "📋 Copia testo"}
        </button>
      </div>
      <textarea readOnly className="input h-48 font-serif text-[13px]" value={letter} />
    </div>
  );
}
