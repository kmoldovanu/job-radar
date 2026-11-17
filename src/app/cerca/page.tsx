"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorBox, Progress } from "@/components/ui";
import { api } from "@/lib/client";
import { runQueue } from "@/lib/queue";
import { REJECT_LABELS, type RejectReason } from "@/lib/types";

interface Task {
  source: string;
  param?: string;
  label: string;
}
interface Rejection {
  reason: RejectReason;
  title: string;
  company: string;
  detail: string;
}
interface SearchResult {
  label: string;
  fetched: number;
  inserted: number;
  updated: number;
  rejected: Partial<Record<RejectReason, number>>;
  samples: Rejection[];
}
interface SourceStatus {
  label: string;
  state: "attesa" | "ok" | "errore";
  info: string;
}
interface Company {
  id: number;
  ats: string;
  token: string;
  name: string;
  url: string;
}

export default function SearchPage() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [statuses, setStatuses] = useState<SourceStatus[]>([]);
  const [summary, setSummary] = useState<{ fetched: number; inserted: number; rejected: Partial<Record<RejectReason, number>>; samples: Rejection[] } | null>(null);
  const [error, setError] = useState("");
  const [evalInfo, setEvalInfo] = useState("");

  async function search() {
    setRunning(true);
    setError("");
    setSummary(null);
    setEvalInfo("");
    try {
      const { tasks, hasRoles } = await api<{ tasks: Task[]; hasRoles: boolean }>("/api/search/tasks");
      if (!hasRoles) setError("Suggerimento: aggiungi i ruoli che cerchi nel Profilo per risultati più pertinenti.");
      if (!tasks.length) throw new Error("Nessuna fonte attiva: controlla le Impostazioni");
      setStatuses(tasks.map((t) => ({ label: t.label, state: "attesa", info: "" })));
      const agg = { fetched: 0, inserted: 0, rejected: {} as Partial<Record<RejectReason, number>>, samples: [] as Rejection[] };

      setProgress({ label: "Interrogo le fonti", done: 0, total: tasks.length });
      await runQueue(
        tasks,
        4,
        (t) => api<SearchResult>("/api/search/run", { method: "POST", json: t }),
        (done, total, res, t) => {
          setProgress({ label: "Interrogo le fonti", done, total });
          const idx = tasks.indexOf(t);
          setStatuses((s) =>
            s.map((x, i) =>
              i !== idx
                ? x
                : res.status === "fulfilled"
                  ? { ...x, state: "ok", info: `${res.value.fetched} trovate, ${res.value.inserted} nuove` }
                  : { ...x, state: "errore", info: (res.reason as Error).message },
            ),
          );
          if (res.status === "fulfilled") {
            agg.fetched += res.value.fetched;
            agg.inserted += res.value.inserted;
            for (const [k, v] of Object.entries(res.value.rejected)) {
              agg.rejected[k as RejectReason] = (agg.rejected[k as RejectReason] ?? 0) + (v ?? 0);
            }
            agg.samples.push(...res.value.samples);
            setSummary({ ...agg });
          }
        },
      );

      // Valutazione AI delle migliori offerte (una chiamata per offerta)
      const { ids, ai } = await api<{ ids: string[]; ai: boolean }>("/api/jobs/pending-eval");
      if (!ai) setEvalInfo("Valutazione AI non attiva (manca ANTHROPIC_API_KEY): uso il punteggio rapido.");
      else if (ids.length) {
        setProgress({ label: "Valutazione AI", done: 0, total: ids.length });
        let failed = 0;
        await runQueue(ids, 4, (id) => api(`/api/jobs/${encodeURIComponent(id)}/evaluate`, { method: "POST" }), (done, total, r) => {
          if (r.status === "rejected") failed++;
          setProgress({ label: "Valutazione AI", done, total });
        });
        setEvalInfo(`Valutate con l'AI ${ids.length - failed} offerte${failed ? ` (${failed} errori)` : ""}.`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
      setRunning(false);
    }
  }

  const totalRejected = summary ? Object.values(summary.rejected).reduce((a, b) => a + (b ?? 0), 0) : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cerca</h1>

      <div className="card space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Interroga tutte le fonti attive, elimina i duplicati, scarta le offerte senza chance concrete e valuta le migliori con l&apos;AI.
        </p>
        <button className="btn-primary w-full py-3 text-base" disabled={running} onClick={search}>
          {running ? "Ricerca in corso…" : "🔎 Cerca ora"}
        </button>
        {progress && <Progress {...progress} />}
        <ErrorBox error={error} />
        {evalInfo && <p className="text-sm text-slate-600">{evalInfo}</p>}
      </div>

      {statuses.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-semibold">Fonti</h2>
          <ul className="space-y-1 text-sm">
            {statuses.map((s, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  {s.state === "ok" ? "✅" : s.state === "errore" ? "⚠️" : "⏳"} {s.label}
                </span>
                <span className={`text-right text-xs ${s.state === "errore" ? "text-red-600" : "text-slate-500"}`}>{s.info}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary && (
        <div className="card space-y-2">
          <h2 className="font-semibold">Risultato</h2>
          <p className="text-sm">
            {summary.fetched} annunci letti · <b>{summary.inserted} nuove offerte</b> · {totalRejected} scartati
          </p>
          <ul className="space-y-1 text-sm">
            {(Object.entries(summary.rejected) as [RejectReason, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{REJECT_LABELS[k]}</span>
                  <span className="font-mono">{v}</span>
                </li>
              ))}
          </ul>
          {summary.samples.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500">Esempi di offerte scartate</summary>
              <ul className="mt-2 space-y-1">
                {summary.samples
                  .filter((s) => s.reason !== "match_basso")
                  .slice(0, 50)
                  .map((s, i) => (
                    <li key={i}>
                      <b>{s.title}</b> — {s.company}: <span className="text-slate-500">{s.detail}</span>
                    </li>
                  ))}
              </ul>
            </details>
          )}
          <Link href="/" className="btn-primary">
            Vedi le offerte →
          </Link>
        </div>
      )}

      <Companies />
      <ManualJob />
    </div>
  );
}

function Companies() {
  const [list, setList] = useState<Company[]>([]);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api<{ companies: Company[] }>("/api/companies").then((r) => setList(r.companies)).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/api/companies", { method: "POST", json: { url, name: name || undefined } });
      setUrl("");
      setName("");
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">Pagine carriere delle aziende</h2>
      <p className="text-xs text-slate-500">
        Incolla il link della pagina careers (Greenhouse, Lever o Ashby). Le offerte di queste aziende verranno incluse in ogni ricerca.
      </p>
      <form onSubmit={add} className="space-y-2">
        <input className="input" placeholder="https://boards.greenhouse.io/azienda" value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="flex gap-2">
          <input className="input" placeholder="Nome azienda (facoltativo)" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary shrink-0" disabled={busy || !url}>
            Aggiungi
          </button>
        </div>
      </form>
      <ErrorBox error={err} />
      {list.length > 0 && (
        <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
          {list.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <span>
                <b>{c.name}</b> <span className="chip">{c.ats}</span>
              </span>
              <button
                className="btn-ghost text-xs"
                onClick={async () => {
                  await api(`/api/companies/${c.id}`, { method: "DELETE" });
                  load();
                }}
              >
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ManualJob() {
  const empty = { title: "", company: "", url: "", location: "", description: "" };
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const r = await api<{ id: string; inserted: number; warnings: string[] }>("/api/jobs/manual", { method: "POST", json: f });
      if (r.inserted) {
        // valutazione AI immediata (se disponibile)
        await api(`/api/jobs/${encodeURIComponent(r.id)}/evaluate`, { method: "POST" }).catch(() => {});
        setMsg(`Aggiunta alle offerte.${r.warnings.length ? " Attenzione: " + r.warnings.join("; ") : ""}`);
        setF(empty);
      } else setMsg("Questa offerta è già presente (o l'avevi già scartata/candidata).");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <details className="card">
      <summary className="cursor-pointer font-semibold">➕ Aggiungi un annuncio a mano (LinkedIn, Indeed…)</summary>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <input className="input" placeholder="Titolo" value={f.title} onChange={set("title")} required />
        <input className="input" placeholder="Azienda" value={f.company} onChange={set("company")} required />
        <input className="input" placeholder="Link all'annuncio" type="url" value={f.url} onChange={set("url")} required />
        <input className="input" placeholder="Località (es. Berlino, Remoto EU)" value={f.location} onChange={set("location")} />
        <textarea className="input h-40" placeholder="Incolla qui il testo dell'annuncio" value={f.description} onChange={set("description")} required />
        <button className="btn-primary" disabled={busy}>
          {busy ? "Salvo e valuto…" : "Aggiungi e valuta"}
        </button>
        {msg && <p className="text-sm text-emerald-700">{msg}</p>}
        <ErrorBox error={err} />
      </form>
    </details>
  );
}
