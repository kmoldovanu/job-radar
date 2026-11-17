"use client";

import { useEffect, useMemo, useState } from "react";
import { Empty, ErrorBox, ViaSource } from "@/components/ui";
import { api, daysAgo, fmtDate } from "@/lib/client";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

interface App {
  id: number;
  jobId: string;
  status: ApplicationStatus;
  appliedAt: string;
  notes: string;
  followUpAt: string | null;
  followUpDone: boolean;
  tailoredId: number | null;
  cvLanguage: string | null;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  sourceUrl: string;
}

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  inviata: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  colloquio: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  offerta: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  rifiutato: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<App[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ApplicationStatus | "tutte">("tutte");

  useEffect(() => {
    api<{ applications: App[] }>("/api/applications")
      .then((r) => setApps(r.applications))
      .catch((e) => {
        setError(e.message);
        setApps([]);
      });
  }, []);

  async function patch(id: number, data: Partial<Pick<App, "status" | "notes" | "followUpDone">>) {
    setApps((l) => l?.map((a) => (a.id === id ? { ...a, ...data } : a)) ?? null);
    try {
      await api(`/api/applications/${id}`, { method: "PATCH", json: data });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const now = Date.now();
  const due = useMemo(
    () => (apps ?? []).filter((a) => a.status === "inviata" && !a.followUpDone && a.followUpAt && new Date(a.followUpAt).getTime() <= now),
    [apps, now],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of apps ?? []) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [apps]);
  const visible = (apps ?? []).filter((a) => filter === "tutte" || a.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Candidature</h1>
          <p className="text-sm text-slate-500">{apps ? `${apps.length} candidature inviate` : "Caricamento…"}</p>
        </div>
        <a className="btn-secondary" href="/api/applications/export">
          ⬇ Esporta CSV
        </a>
      </div>
      <ErrorBox error={error} />

      {due.length > 0 && (
        <div className="card border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <h2 className="font-semibold">⏰ Follow-up da fare ({due.length})</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Nessuna risposta dopo qualche giorno: scrivi un breve messaggio di follow-up al recruiter.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {due.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <span>
                  <b>{a.company}</b> — {a.title}
                </span>
                <button className="btn-ghost text-xs" onClick={() => patch(a.id, { followUpDone: true })}>
                  Fatto ✓
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {apps && apps.length > 0 && (
        <div className="flex flex-wrap gap-1 text-sm">
          {(["tutte", ...APPLICATION_STATUSES] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 capitalize ${filter === s ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>
              {s} {s === "tutte" ? apps.length : (counts[s] ?? 0)}
            </button>
          ))}
        </div>
      )}

      {apps && apps.length === 0 && !error && <Empty>Non hai ancora segnato nessuna candidatura. Premi “✅ Candidato!” su un&apos;offerta.</Empty>}

      <div className="space-y-3">
        {visible.map((a) => (
          <article key={a.id} className="card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-semibold leading-snug">{a.title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {a.company}
                  {a.location ? ` · ${a.location}` : ""}
                </p>
                <p className="text-xs text-slate-500">
                  Inviata il {fmtDate(a.appliedAt)} ({daysAgo(a.appliedAt)}) · <ViaSource source={a.source} url={a.sourceUrl} />
                </p>
              </div>
              <select
                value={a.status}
                onChange={(e) => patch(a.id, { status: e.target.value as ApplicationStatus })}
                className={`rounded-lg border-0 px-2 py-1 text-sm font-medium capitalize ${STATUS_STYLE[a.status]}`}
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <a className="btn-secondary" href={a.url} target="_blank" rel="noopener noreferrer">
                ↗ Annuncio
              </a>
              {a.tailoredId ? (
                <>
                  <a className="btn-secondary" href={`/api/jobs/${encodeURIComponent(a.jobId)}/download?doc=cv&format=pdf&tid=${a.tailoredId}`}>
                    📄 CV usato ({a.cvLanguage?.toUpperCase()})
                  </a>
                  <a className="btn-secondary" href={`/api/jobs/${encodeURIComponent(a.jobId)}/download?doc=letter&format=pdf&tid=${a.tailoredId}`}>
                    ✉️ Lettera
                  </a>
                </>
              ) : (
                <span className="chip">CV master</span>
              )}
              {a.followUpAt && a.status === "inviata" && (
                <span className={`chip ${a.followUpDone ? "" : new Date(a.followUpAt).getTime() <= now ? "bg-amber-100 text-amber-800" : ""}`}>
                  {a.followUpDone ? "Follow-up fatto ✓" : `Follow-up: ${fmtDate(a.followUpAt)}`}
                </span>
              )}
            </div>
            <textarea
              className="input h-16 text-sm"
              placeholder="Note (contatti, date dei colloqui, impressioni…)"
              defaultValue={a.notes}
              onBlur={(e) => e.target.value !== a.notes && patch(a.id, { notes: e.target.value })}
            />
          </article>
        ))}
      </div>
    </div>
  );
}
