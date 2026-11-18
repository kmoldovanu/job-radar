"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { ErrorBox, PageHeader, Progress } from "@/components/ui";
import { api } from "@/lib/client";
import { runQueue } from "@/lib/queue";
import { REJECT_LABELS, type Profile, type RejectReason, type Settings } from "@/lib/types";

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

type AutoEval = Settings["autoEvaluate"];

const MODE_LABEL: Record<string, string> = { remote: "remoto", hybrid: "ibrido", onsite: "in sede" };
const SENIORITY_LABEL: Record<string, string> = { junior: "junior", mid: "intermedio", senior: "senior", lead: "lead" };

export default function SearchPage() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [statuses, setStatuses] = useState<SourceStatus[]>([]);
  const [summary, setSummary] = useState<{ fetched: number; inserted: number; rejected: Partial<Record<RejectReason, number>>; samples: Rejection[] } | null>(null);
  const [error, setError] = useState("");
  const [evalInfo, setEvalInfo] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [aiKey, setAiKey] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [taskCount, setTaskCount] = useState<number | null>(null);

  useEffect(() => {
    api<{ settings: Settings; env: Record<string, boolean> }>("/api/settings")
      .then((r) => {
        setSettings(r.settings);
        setAiKey(!!r.env.ANTHROPIC_API_KEY);
      })
      .catch((e) => setError(e.message));
    api<{ profile: Profile }>("/api/profile")
      .then((r) => setProfile(r.profile))
      .catch(() => {});
    api<{ tasks: Task[] }>("/api/search/tasks")
      .then((r) => setTaskCount(r.tasks.length))
      .catch(() => {});
  }, []);

  async function setAutoEval(v: AutoEval) {
    if (!settings) return;
    const next = { ...settings, autoEvaluate: v };
    setSettings(next);
    await api("/api/settings", { method: "PUT", json: next }).catch((e) => setError((e as Error).message));
  }

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

      // Valutazione AI come scelto sopra (una chiamata per offerta)
      const { ids, ai, scope } = await api<{ ids: string[]; ai: boolean; scope?: AutoEval }>("/api/jobs/pending-eval?scope=auto");
      if (!ai) setEvalInfo("Valutazione AI non attiva (manca ANTHROPIC_API_KEY): le offerte hanno solo il punteggio rapido.");
      else if (scope === "off") setEvalInfo("Valutazione AI saltata, come scelto. Puoi lanciarla dopo da Offerte, in Strumenti AI.");
      else if (ids.length) {
        setProgress({ label: "Valutazione AI", done: 0, total: ids.length });
        let failed = 0;
        let hidden = 0;
        await runQueue(ids, 4, (id) => api<{ hidden?: boolean }>(`/api/jobs/${encodeURIComponent(id)}/evaluate`, { method: "POST" }), (done, total, r) => {
          if (r.status === "rejected") failed++;
          else if (r.value.hidden) hidden++;
          setProgress({ label: "Valutazione AI", done, total });
        });
        setEvalInfo(
          `Valutate con l'AI ${ids.length - failed} offerte${failed ? ` (${failed} errori)` : ""}.` +
            (hidden ? ` ${hidden} con punteggio AI sotto ${settings?.autoHideBelow ?? 20} sono andate tra le Scartate.` : ""),
        );
      } else setEvalInfo("Nessuna offerta nuova da valutare con l'AI.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
      setRunning(false);
    }
  }

  const totalRejected = summary ? Object.values(summary.rejected).reduce((a, b) => a + (b ?? 0), 0) : 0;
  const prefs = profile?.preferences;
  const auto = settings?.autoEvaluate ?? "top";

  return (
    <div className="space-y-5">
      <PageHeader title="Cerca" subtitle="Nuove offerte da tutte le fonti attive" />

      <section className="card space-y-3" aria-labelledby="cosa">
        <div className="flex items-center justify-between">
          <h2 id="cosa" className="text-lg font-semibold">Cosa cerchi</h2>
          <Link href="/profilo" className="text-sm text-signal">Modifica</Link>
        </div>
        {prefs ? (
          <dl className="space-y-2.5 text-sm">
            <div>
              <dt className="text-muted">Ruoli</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {prefs.targetRoles.length ? (
                  prefs.targetRoles.map((r) => <span key={r} className="chip text-[13px]">{r}</span>)
                ) : (
                  <Link href="/profilo" className="text-signal underline">Aggiungi i ruoli che cerchi: senza, i risultati sono generici</Link>
                )}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-muted">Modalità</dt>
                <dd>{prefs.workModes.map((m) => MODE_LABEL[m]).join(", ") || "tutte"}</dd>
              </div>
              <div>
                <dt className="text-muted">Livello</dt>
                <dd>{SENIORITY_LABEL[prefs.seniority]}</dd>
              </div>
              <div>
                <dt className="text-muted">Annunci</dt>
                <dd>ultimi {settings?.maxAgeDays ?? 21} giorni</dd>
              </div>
              <div>
                <dt className="text-muted">Fonti</dt>
                <dd>
                  {taskCount ?? "…"} richieste · <Link href="/impostazioni" className="text-signal">cambia</Link>
                </dd>
              </div>
            </div>
            {prefs.excludeKeywords.length > 0 && (
              <div>
                <dt className="text-muted">Escludi</dt>
                <dd>{prefs.excludeKeywords.join(", ")}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted">Caricamento…</p>
        )}
      </section>

      <section className="card space-y-3" aria-labelledby="ai">
        <h2 id="ai" className="text-lg font-semibold">Chi dà il punteggio</h2>
        <p className="text-sm text-muted">
          Ogni offerta riceve subito un <b className="font-semibold text-ink">punteggio rapido</b>, gratis, confrontando titolo e competenze con il tuo profilo.
          L&apos;<b className="font-semibold text-ink">AI</b> invece legge tutto l&apos;annuncio come un recruiter: punteggio più affidabile,
          chance, punti di forza e cosa manca. Costa una chiamata per offerta (circa 3–5 secondi l&apos;una, 4 in parallelo).
        </p>
        {!aiKey && settings && (
          <p className="rounded-xl border border-line bg-night p-3 text-sm text-muted">
            L&apos;AI non è attiva: manca ANTHROPIC_API_KEY. Per ora le offerte avranno solo il punteggio rapido.
          </p>
        )}
        <div role="radiogroup" aria-label="Valutazione AI dopo la ricerca" className="space-y-2">
          {(
            [
              ["off", "Solo punteggio rapido", "Più veloce. Puoi chiedere all'AI dopo, offerta per offerta."],
              ["top", `AI sulle migliori ${settings?.aiEvaluateTop ?? 40}`, "Consigliato: l'AI valuta solo le offerte con il punteggio rapido più alto."],
              ["all", "AI su tutte le nuove", "Fino a 100 offerte per ricerca. Più lento, ma nessuna offerta resta senza giudizio."],
            ] as const
          ).map(([v, title, desc]) => {
            const on = auto === v;
            return (
              <button
                key={v}
                role="radio"
                aria-checked={on}
                disabled={!settings || !aiKey}
                onClick={() => setAutoEval(v)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${on ? "border-signal/60 bg-signal/8" : "border-line hover:border-slate-600"}`}
              >
                <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-signal" : "border-slate-600"}`}>
                  {on && <span className="size-2.5 rounded-full bg-signal" />}
                </span>
                <span>
                  <span className="block text-[15px] font-medium">{title}</span>
                  <span className="block text-[13px] text-muted">{desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <ol className="space-y-2 text-sm text-muted">
          <li className="flex gap-3"><Step n={1} /> Legge le offerte da {taskCount ?? "tutte le"} fonti, con i tuoi ruoli come parole di ricerca.</li>
          <li className="flex gap-3"><Step n={2} /> Scarta duplicati, annunci vecchi, sospetti, non idonei per paese o lingua.</li>
          <li className="flex gap-3"><Step n={3} /> Dà il punteggio come hai scelto sopra. Le offerte arrivate ora le trovi in Offerte, sotto &ldquo;Da vedere&rdquo;.</li>
        </ol>
        <button className="btn-primary min-h-13 w-full text-base" disabled={running} onClick={search}>
          <Icon name="search" className="size-5" strokeWidth={2.2} />
          {running ? "Ricerca in corso…" : "Avvia la ricerca"}
        </button>
        {progress && <Progress {...progress} />}
        <ErrorBox error={error} />
        {evalInfo && <p className="text-sm text-muted">{evalInfo}</p>}
      </section>

      {summary && (
        <section className="card space-y-3 border-signal/30">
          <h2 className="text-lg font-semibold">Risultato</h2>
          <p className="text-sm">
            <span className="font-display text-3xl font-bold text-signal tabular-nums">{summary.inserted}</span>{" "}
            <span className="text-ink">nuove offerte</span>
            <span className="block text-muted">su {summary.fetched} annunci letti, {totalRejected} scartati</span>
          </p>
          <ul className="space-y-1 text-sm">
            {(Object.entries(summary.rejected) as [RejectReason, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <li key={k} className="flex justify-between text-muted">
                  <span>{REJECT_LABELS[k]}</span>
                  <span className="tabular-nums text-ink">{v}</span>
                </li>
              ))}
          </ul>
          {summary.samples.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted">Esempi di offerte scartate</summary>
              <ul className="mt-2 space-y-1">
                {summary.samples
                  .filter((s) => s.reason !== "match_basso")
                  .slice(0, 50)
                  .map((s, i) => (
                    <li key={i}>
                      <b>{s.title}</b>, {s.company}: <span className="text-muted">{s.detail}</span>
                    </li>
                  ))}
              </ul>
            </details>
          )}
          <Link href="/?view=new" className="btn-primary w-full">
            Vedi le offerte da vedere
          </Link>
        </section>
      )}

      {statuses.length > 0 && (
        <details className="card" open={running}>
          <summary className="cursor-pointer font-semibold">Fonti ({statuses.filter((s) => s.state === "ok").length}/{statuses.length})</summary>
          <ul className="mt-3 space-y-1.5 text-sm">
            {statuses.map((s, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${s.state === "ok" ? "bg-good" : s.state === "errore" ? "bg-bad" : "bg-slate-600"}`} aria-hidden="true" />
                  {s.label}
                </span>
                <span className={`text-right text-xs ${s.state === "errore" ? "text-bad" : "text-muted"}`}>{s.info}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Companies />
      <ManualJob />
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line font-display text-xs font-semibold text-ink" aria-hidden="true">
      {n}
    </span>
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
      <h2 className="text-lg font-semibold">Pagine carriere delle aziende</h2>
      <p className="text-sm text-muted">
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
        <ul className="divide-y divide-line text-sm">
          {list.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <span>
                <b className="font-medium">{c.name}</b> <span className="chip">{c.ats}</span>
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
      <summary className="cursor-pointer font-semibold">Aggiungi un annuncio a mano (LinkedIn, Indeed…)</summary>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <input className="input" placeholder="Titolo" value={f.title} onChange={set("title")} required />
        <input className="input" placeholder="Azienda" value={f.company} onChange={set("company")} required />
        <input className="input" placeholder="Link all'annuncio" type="url" value={f.url} onChange={set("url")} required />
        <input className="input" placeholder="Località (es. Berlino, Remoto EU)" value={f.location} onChange={set("location")} />
        <textarea className="input h-40" placeholder="Incolla qui il testo dell'annuncio" value={f.description} onChange={set("description")} required />
        <button className="btn-primary" disabled={busy}>
          {busy ? "Salvo e valuto…" : "Aggiungi e valuta"}
        </button>
        {msg && <p className="text-sm text-good">{msg}</p>}
        <ErrorBox error={err} />
      </form>
    </details>
  );
}
