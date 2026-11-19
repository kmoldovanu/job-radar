"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, PageHeader, Pill, StationLine, ViaSource } from "@/components/ui";
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

/** Ogni stato è una linea: il suo colore e la fermata a cui è arrivata la candidatura. */
const STATUS_LINE: Record<ApplicationStatus, { color: string; at: number; style: string }> = {
  inviata: { color: "var(--color-sky)", at: 1, style: "bg-sky/15 text-[#8dbcff]" },
  colloquio: { color: "var(--color-violet)", at: 2, style: "bg-violet/15 text-[#c3b1ff]" },
  offerta: { color: "var(--color-good)", at: 3, style: "bg-good/15 text-good" },
  rifiutato: { color: "var(--color-bad)", at: 1, style: "bg-bad/15 text-[#ff9a92]" },
};
const STOPS = ["Trovata", "Inviata", "Colloquio", "Offerta"];

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
      <PageHeader
        title="Candidature"
        subtitle={apps ? `${apps.length} candidature inviate` : "Caricamento…"}
        action={
          <a className="btn-secondary" href="/api/applications/export">
            <Icon name="download" className="size-4" />
            CSV
          </a>
        }
      />
      <ErrorBox error={error} />

      {due.length > 0 && (
        <div className="card border-signal/50 bg-signal/[0.06]">
          <h2 className="text-lg font-bold text-signal">Follow-up da fare ({due.length})</h2>
          <p className="text-sm text-muted">
            Nessuna risposta dopo qualche giorno: scrivi un breve messaggio di follow-up al recruiter.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {due.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <span>
                  <b>{a.company}</b> — {a.title}
                </span>
                <button className="btn-ghost text-xs" onClick={() => patch(a.id, { followUpDone: true })}>
                  <Icon name="check" className="size-3.5" strokeWidth={2.4} />
                  Fatto
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {apps && apps.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {(["tutte", ...APPLICATION_STATUSES] as const).map((s) => (
            <Pill key={s} on={filter === s} onClick={() => setFilter(s)}>
              <span className="capitalize">{s}</span> <span className="tabular-nums opacity-70">{s === "tutte" ? apps.length : (counts[s] ?? 0)}</span>
            </Pill>
          ))}
        </div>
      )}

      {apps && apps.length === 0 && !error && <Empty>Non hai ancora segnato nessuna candidatura. Premi “Candidato” su un&apos;offerta.</Empty>}

      <div className="space-y-3">
        {visible.map((a) => (
          <article key={a.id} className="card animate-rise space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-[18px] font-bold leading-snug tracking-[-0.01em]">{a.title}</h2>
                <p className="text-[15px] font-semibold text-slate-300">
                  {a.company}
                  {a.location ? ` ∙ ${a.location}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Inviata il {fmtDate(a.appliedAt)} ({daysAgo(a.appliedAt)}) ∙ <ViaSource source={a.source} url={a.sourceUrl} />
                </p>
              </div>
              <select
                value={a.status}
                onChange={(e) => patch(a.id, { status: e.target.value as ApplicationStatus })}
                aria-label="Stato della candidatura"
                className={`min-h-9 shrink-0 cursor-pointer rounded-[8px] border-0 px-2 text-sm font-bold capitalize outline-offset-2 ${STATUS_LINE[a.status].style}`}
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <StationLine
              stops={a.status === "rifiutato" ? ["Trovata", "Rifiutato", "Colloquio", "Offerta"] : STOPS}
              at={STATUS_LINE[a.status].at}
              color={STATUS_LINE[a.status].color}
              stopped={a.status === "rifiutato"}
            />
            <div className="flex flex-wrap gap-2 text-sm">
              <a className="btn-secondary" href={a.url} target="_blank" rel="noopener noreferrer">
                <Icon name="external" className="size-4" />
                Annuncio
              </a>
              {a.tailoredId ? (
                <>
                  <a className="btn-secondary" href={`/api/jobs/${encodeURIComponent(a.jobId)}/download?doc=cv&format=pdf&tid=${a.tailoredId}`}>
                    CV usato ({a.cvLanguage?.toUpperCase()})
                  </a>
                  <a className="btn-secondary" href={`/api/jobs/${encodeURIComponent(a.jobId)}/download?doc=letter&format=pdf&tid=${a.tailoredId}`}>
                    Lettera
                  </a>
                </>
              ) : (
                <span className="chip">CV master</span>
              )}
              {a.followUpAt && a.status === "inviata" && (
                <span className={`chip ${a.followUpDone ? "" : new Date(a.followUpAt).getTime() <= now ? "border-signal/50 text-signal" : ""}`}>
                  {a.followUpDone ? "Follow-up fatto" : `Follow-up: ${fmtDate(a.followUpAt)}`}
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
