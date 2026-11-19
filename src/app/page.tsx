"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, LiveLine, MatchTag, PageHeader, Pill, Progress, SeenBadge, Segmented, Toast, ViaSource } from "@/components/ui";
import { api, companySearchUrl, daysAgo } from "@/lib/client";
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
  createdAt: string;
  seenAt: string | null;
  status: string;
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

type View = "new" | "seen" | "all" | "dismissed";
type Sort = "ai" | "quick" | "recent";
interface Counts {
  new: number;
  seen: number;
  all: number;
  dismissed: number;
  noAi: number;
  ai: number;
}

const MODE: Record<string, string> = { remote: "Remoto", hybrid: "Ibrido", onsite: "In sede", unknown: "" };

export default function OffersPage() {
  const [view, setView] = useState<View>("new");
  const [sort, setSort] = useState<Sort>("ai");
  const [ready, setReady] = useState(false);
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState("");
  const [prepareN, setPrepareN] = useState(5);
  const [batch, setBatch] = useState<{ label: string; done: number; total: number } | null>(null);
  const [batchErrors, setBatchErrors] = useState<string[]>([]);
  const [onlyHigh, setOnlyHigh] = useState(false);
  const [onlyAi, setOnlyAi] = useState(false);
  const [hideBelow, setHideBelow] = useState(20);
  const [evalReport, setEvalReport] = useState<{ done: number; failed: number; firstError: string; alta: number; media: number; bassa: number; hidden: number } | null>(null);
  const [onlyReady, setOnlyReady] = useState(false);
  const [toast, setToast] = useState<{ message: string; action?: string; onAction?: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toolsRef = useRef<HTMLDetailsElement>(null);

  // vista e ordinamento dall'indirizzo (?view=seen&sort=recent), così il link da "Cerca" apre la vista giusta
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const v = p.get("view");
    if (v === "new" || v === "seen" || v === "all" || v === "dismissed") setView(v);
    const s = p.get("sort");
    if (s === "recent" || s === "quick") setSort(s);
    if (p.get("ai") === "1") setOnlyAi(true);
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await api<{ jobs: JobRow[]; counts: Counts }>(`/api/jobs?view=${view}&sort=${sort}`);
      setJobs(r.jobs);
      setCounts(r.counts);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setJobs([]);
    }
  }, [view, sort]);

  useEffect(() => {
    if (!ready) return;
    setJobs(null);
    load();
    const p = new URLSearchParams();
    if (view !== "new") p.set("view", view);
    if (sort !== "ai") p.set("sort", sort);
    window.history.replaceState(null, "", p.size ? `/?${p}` : "/");
  }, [ready, view, sort, load]);

  useEffect(() => {
    api<{ settings: { prepareCount: number; autoHideBelow: number } }>("/api/settings")
      .then((s) => {
        setPrepareN(s.settings.prepareCount);
        setHideBelow(s.settings.autoHideBelow);
      })
      .catch(() => {});
  }, []);

  function showToast(t: typeof toast) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  const visible = useMemo(() => {
    let l = jobs ?? [];
    if (onlyAi) l = l.filter((j) => j.aiEval);
    if (onlyHigh) l = l.filter((j) => j.aiEval?.chance === "alta");
    if (onlyReady) l = l.filter((j) => j.hasTailored);
    return l;
  }, [jobs, onlyAi, onlyHigh, onlyReady]);

  /** Aggiorna lo stato "vista" senza togliere la scheda dalla lista (sparisce alla prossima apertura della vista). */
  const setSeen = useCallback(async (job: JobRow, seen: boolean) => {
    if (!!job.seenAt === seen) return;
    setJobs((l) => l?.map((j) => (j.id === job.id ? { ...j, seenAt: seen ? new Date().toISOString() : null } : j)) ?? null);
    setCounts((c) => (c ? { ...c, new: c.new + (seen ? -1 : 1), seen: c.seen + (seen ? 1 : -1) } : c));
    try {
      await api(`/api/jobs/${encodeURIComponent(job.id)}/seen`, { method: "POST", json: { seen } });
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  async function markAllSeen() {
    const ids = visible.filter((j) => !j.seenAt).map((j) => j.id);
    if (!ids.length) return;
    await api("/api/jobs/seen", { method: "POST", json: { ids } });
    showToast({ message: `${ids.length} offerte segnate come viste` });
    load();
  }

  async function prepareBatch() {
    if (!jobs) return;
    const targets = visible.filter((j) => !j.hasTailored).slice(0, prepareN);
    if (!targets.length) return;
    setBatchErrors([]);
    setBatch({ label: "Preparo CV e lettere su misura", done: 0, total: targets.length });
    let hiddenCount = 0;
    await runQueue(
      targets,
      3,
      async (j) => {
        // se manca la valutazione AI la facciamo prima (serve per lingua e parole chiave)
        if (!j.aiEval) {
          const r = await api<{ hidden?: boolean }>(`/api/jobs/${encodeURIComponent(j.id)}/evaluate`, { method: "POST" }).catch(() => null);
          if (r?.hidden) {
            hiddenCount++;
            return; // punteggio AI troppo basso: niente CV, l'offerta è già tra le scartate
          }
        }
        await api(`/api/jobs/${encodeURIComponent(j.id)}/tailor`, { method: "POST" });
      },
      (done, total, res, j) => {
        setBatch({ label: "Preparo CV e lettere su misura", done, total });
        if (res.status === "rejected") setBatchErrors((e) => [...e, `${j.company}: ${(res.reason as Error).message}`]);
        else setJobs((list) => list?.map((x) => (x.id === j.id ? { ...x, hasTailored: true } : x)) ?? null);
      },
    );
    setBatch(null);
    if (hiddenCount) showToast({ message: `${hiddenCount} saltate e nascoste: punteggio AI sotto ${hideBelow}` });
    load();
  }

  async function evaluateBatch(scope: "top" | "all") {
    const { ids, ai } = await api<{ ids: string[]; ai: boolean }>(`/api/jobs/pending-eval?scope=${scope}`);
    if (!ai) return setError("Valutazione AI non disponibile: imposta ANTHROPIC_API_KEY");
    if (!ids.length) return showToast({ message: "Nessuna offerta da valutare" });
    setEvalReport(null);
    setBatch({ label: "Valutazione AI", done: 0, total: ids.length });
    const rep = { done: 0, failed: 0, firstError: "", alta: 0, media: 0, bassa: 0, hidden: 0 };
    await runQueue(
      ids,
      4,
      (id) => api<{ evaluation: AiEvaluation; hidden?: boolean }>(`/api/jobs/${encodeURIComponent(id)}/evaluate`, { method: "POST" }),
      (done, total, res) => {
        setBatch({ label: "Valutazione AI", done, total });
        if (res.status === "fulfilled") {
          rep.done++;
          const c = res.value.evaluation.chance;
          if (c === "alta" || c === "media" || c === "bassa") rep[c]++;
          if (res.value.hidden) rep.hidden++;
        } else {
          rep.failed++;
          rep.firstError ||= (res.reason as Error).message;
        }
      },
    );
    setBatch(null);
    setEvalReport(rep);
    if (toolsRef.current) toolsRef.current.open = false;
    // le offerte appena valutate in cima: ordinate per punteggio AI, solo quelle valutate
    setOnlyAi(rep.done > 0);
    if (view === "all" && sort === "ai") load();
    else {
      setView("all");
      setSort("ai");
    }
  }

  function removed(job: JobRow, kind: "apply" | "dismiss" | "restore" | "hidden", score?: number) {
    setJobs((l) => l?.filter((j) => j.id !== job.id) ?? null);
    setCounts((c) => {
      if (!c) return c;
      const n = { ...c };
      const bucket = job.seenAt ? "seen" : "new";
      if (kind === "restore") {
        n.dismissed--;
        n[bucket]++;
        n.all++;
      } else {
        n[bucket]--;
        n.all--;
        if (kind === "dismiss" || kind === "hidden") n.dismissed++;
      }
      return n;
    });
    if (kind === "dismiss" || kind === "hidden")
      showToast({
        message: kind === "hidden" ? `Punteggio AI ${score}: nascosta tra le Scartate` : "Offerta scartata",
        action: "Annulla",
        onAction: async () => {
          setToast(null);
          await api(`/api/jobs/${encodeURIComponent(job.id)}/restore`, { method: "POST" });
          load();
        },
      });
    if (kind === "apply") showToast({ message: "Aggiunta alle candidature" });
    if (kind === "restore") showToast({ message: "Offerta ripristinata" });
  }

  const unseenVisible = visible.filter((j) => !j.seenAt).length;
  const notTailored = visible.filter((j) => !j.hasTailored).length;

  return (
    <div className="relative isolate space-y-4">
      <RadarRings />
      <PageHeader
        title="Offerte"
        subtitle={<LiveLine>{counts ? `${counts.new} da vedere ∙ ${counts.seen} già viste` : "Caricamento…"}</LiveLine>}
        action={
          <Link href="/cerca" className="btn-primary">
            <Icon name="search" className="size-4" />
            Cerca
          </Link>
        }
      />

      <Segmented
        label="Quali offerte mostrare"
        value={view}
        onChange={setView}
        options={[
          { value: "new", label: "Da vedere", count: counts?.new },
          { value: "seen", label: "Viste", count: counts?.seen },
          { value: "all", label: "Tutte", count: counts?.all },
          { value: "dismissed", label: "Scartate", count: counts?.dismissed },
        ]}
      />

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        <Pill on={sort === "ai"} onClick={() => setSort("ai")}>Punteggio AI</Pill>
        <Pill on={sort === "quick"} onClick={() => setSort("quick")}>Stima dal CV</Pill>
        <Pill on={sort === "recent"} onClick={() => setSort("recent")}>Più recenti</Pill>
      </div>
      <div className="-mx-4 -mt-2 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        <Pill on={onlyAi} onClick={() => setOnlyAi(!onlyAi)}>
          Solo valutate AI {counts ? <span className="tabular-nums opacity-70">{counts.ai}</span> : null}
        </Pill>
        <Pill on={onlyHigh} onClick={() => setOnlyHigh(!onlyHigh)}>Chance alta</Pill>
        <Pill on={onlyReady} onClick={() => setOnlyReady(!onlyReady)}>CV pronto</Pill>
      </div>
      <p className="-mt-1 text-[13px] leading-snug text-muted">
        {sort === "ai"
          ? "In cima le offerte valutate dall'AI, dalla più adatta. Sotto le altre, per stima rapida dal tuo CV."
          : sort === "quick"
            ? "Per stima rapida: titoli, competenze e parole chiave del tuo CV trovati nell'annuncio, senza AI."
            : "Dalle offerte trovate per ultime."}
      </p>

      <ErrorBox error={error} />

      {view !== "dismissed" && jobs && jobs.length > 0 && (
        <details ref={toolsRef} className="group rounded-2xl border border-line bg-panel">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <Icon name="sparkle" className="size-4 text-signal" />
            Strumenti AI
            <span className="mono ml-1 text-faint">{counts?.noAi ? `${counts.noAi} senza valutazione` : "tutte valutate"}</span>
            <Icon name="chevron" className="ml-auto size-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-4 border-t border-line p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted">
                La valutazione AI legge l&apos;annuncio come un recruiter e dà un punteggio con chance, punti di forza e cosa manca.
                Senza AI vedi la stima rapida, calcolata dal tuo CV.
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" disabled={!!batch || !counts?.noAi} onClick={() => evaluateBatch("top")}>
                  Valuta le migliori
                </button>
                <button className="btn-ghost" disabled={!!batch || !counts?.noAi} onClick={() => evaluateBatch("all")}>
                  Valuta tutte ({Math.min(counts?.noAi ?? 0, 100)})
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted">CV e lettera su misura, in blocco, per le prime offerte della lista qui sotto che non li hanno ancora.</p>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="n">
                  Quante candidature preparare
                </label>
                <input
                  id="n"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={30}
                  value={prepareN}
                  onChange={(e) => setPrepareN(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                  className="input w-20 text-center"
                />
                <button className="btn-primary flex-1" disabled={!!batch || !notTailored} onClick={prepareBatch}>
                  Prepara {Math.min(prepareN, notTailored)} candidature
                </button>
              </div>
            </div>
            {batch && <Progress {...batch} />}
            {batchErrors.length > 0 && <ErrorBox error={batchErrors.join("\n")} />}
          </div>
        </details>
      )}

      {evalReport && (
        <div className="space-y-2 rounded-2xl bg-cream p-5" role="status">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold">Valutazione AI finita</h2>
            <button className="btn-icon size-9 bg-transparent" onClick={() => setEvalReport(null)} aria-label="Chiudi">
              <Icon name="x" className="size-4" />
            </button>
          </div>
          <p className="text-sm">
            {evalReport.done} offerte valutate: <span className="text-good">{evalReport.alta} chance alta</span>,{" "}
            <span className="text-amber">{evalReport.media} media</span>, <span className="text-bad">{evalReport.bassa} bassa</span>.
            {evalReport.done > evalReport.hidden && " Le vedi qui sotto, dalla più adatta."}
          </p>
          {evalReport.hidden > 0 && (
            <p className="text-sm text-muted">
              {evalReport.hidden === 1 ? "1 offerta aveva" : `${evalReport.hidden} offerte avevano`} punteggio AI sotto {hideBelow}: le ho
              spostate tra le Scartate e non verranno più riproposte.
            </p>
          )}
          {evalReport.failed > 0 && (
            <p className="text-sm text-bad">
              Non riuscite: {evalReport.failed}. Errore: {evalReport.firstError}
            </p>
          )}
          {evalReport.done >= 5 && evalReport.bassa / evalReport.done >= 0.6 && (
            <p className="text-sm text-muted">
              L&apos;AI è volutamente severa, ma se quasi tutte hanno chance bassa la ricerca sta trovando offerte lontane dal tuo
              profilo. Ricarica il CV o controlla i ruoli e le parole da escludere in{" "}
              <Link href="/profilo" className="text-signal underline">Profilo</Link>, oppure alza il &ldquo;Match rapido
              minimo&rdquo; in <Link href="/impostazioni" className="text-signal underline">Impostazioni</Link>. Apri qualche
              offerta e leggi &ldquo;Cosa manca&rdquo;: ti dice cosa la frena.
            </p>
          )}
        </div>
      )}

      {view === "new" && unseenVisible > 1 && (
        <button className="flex min-h-10 items-center gap-1.5 text-sm text-muted hover:text-ink" onClick={markAllSeen}>
          <Icon name="check" className="size-4" />
          Segna tutte come viste ({unseenVisible})
        </button>
      )}

      {jobs === null && <SkeletonList />}

      {jobs && visible.length === 0 && !error && (
        <Empty>
          {view === "new" && counts && counts.all > 0 ? (
            <>
              Hai visto tutto. <Link className="text-signal underline" href="/cerca">Avvia una nuova ricerca</Link> o riguarda le{" "}
              <button className="text-signal underline" onClick={() => setView("seen")}>offerte già viste</button>.
            </>
          ) : view === "dismissed" ? (
            "Nessuna offerta scartata."
          ) : onlyAi || onlyHigh || onlyReady ? (
            "Nessuna offerta con questi filtri."
          ) : (
            <>
              Nessuna offerta per ora. Completa il <Link className="text-signal underline" href="/profilo">profilo</Link> e poi{" "}
              <Link className="text-signal underline" href="/cerca">avvia una ricerca</Link>.
            </>
          )}
        </Empty>
      )}

      <div className="space-y-3">
        {visible.map((j) => (
          <JobCard key={j.id} job={j} hideBelow={hideBelow} onSeen={setSeen} onRemoved={removed} onChange={load} />
        ))}
      </div>

      {toast && <Toast {...toast} />}
    </div>
  );
}

/** Anelli del radar, leggerissimi, dietro l'intestazione (solo da computer). */
function RadarRings() {
  return (
    <svg viewBox="0 0 400 400" className="pointer-events-none absolute -top-40 right-[-80px] -z-10 hidden size-[400px] md:block" aria-hidden="true">
      <g fill="none" stroke="#e5432a" strokeOpacity="0.14">
        <circle cx="200" cy="200" r="70" />
        <circle cx="200" cy="200" r="130" />
        <circle cx="200" cy="200" r="190" />
      </g>
      <path d="M200 200 L330 110" stroke="#e5432a" strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="292" cy="262" r="4" fill="#e5432a" fillOpacity="0.55" />
      <circle cx="96" cy="150" r="3" fill="#e5432a" fillOpacity="0.35" />
    </svg>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card flex gap-3">
          <div className="size-14 shrink-0 rounded-full border-4 border-line" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-3/4 rounded bg-panel-2" />
            <div className="h-3 w-1/2 rounded bg-panel-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function JobCard({
  job, hideBelow, onSeen, onRemoved, onChange,
}: {
  job: JobRow;
  hideBelow: number;
  onSeen: (job: JobRow, seen: boolean) => void;
  onRemoved: (job: JobRow, kind: "apply" | "dismiss" | "restore" | "hidden", score?: number) => void;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<{ job: { description: string }; tailored: Tailored | null } | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [ev, setEv] = useState<AiEvaluation | null>(job.aiEval);
  const score = ev ? Math.round(ev.score) : (job.aiScore ?? job.quickScore);
  const idEnc = encodeURIComponent(job.id);
  const seen = !!job.seenAt;
  const dismissed = job.status === "dismissed";

  async function loadDetail() {
    setDetail(await api(`/api/jobs/${idEnc}`));
  }

  function toggle() {
    setOpen(!open);
    if (!open) {
      if (!seen && !dismissed) onSeen(job, true);
      if (!detail) loadDetail().catch((e) => setErr(e.message));
    }
  }

  async function act(kind: "apply" | "dismiss" | "tailor" | "evaluate" | "restore") {
    setBusy(kind);
    setErr("");
    try {
      if (kind === "tailor" && !ev) {
        const pre = await api<{ evaluation: AiEvaluation; hidden?: boolean }>(`/api/jobs/${idEnc}/evaluate`, { method: "POST" }).catch(() => null);
        if (pre?.hidden) return onRemoved(job, "hidden", Math.round(pre.evaluation.score));
      }
      const r = await api<{ evaluation?: AiEvaluation; hidden?: boolean }>(`/api/jobs/${idEnc}/${kind}`, { method: "POST" });
      if (kind === "apply" || kind === "dismiss" || kind === "restore") return onRemoved(job, kind);
      if (r.hidden && r.evaluation) return onRemoved(job, "hidden", Math.round(r.evaluation.score));
      if (kind === "evaluate" && r.evaluation) setEv(r.evaluation);
      if (!seen) onSeen(job, true);
      await loadDetail();
      setOpen(true);
      if (kind === "tailor") onChange();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  const t = detail?.tailored;
  const dl = (doc: string, format: string) => `/api/jobs/${idEnc}/download?doc=${doc}&format=${format}`;
  const markSeenOnOpen = () => !seen && !dismissed && onSeen(job, true);

  const m = job.match;
  return (
    <article className="card animate-rise space-y-3.5 transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-[0_8px_24px_-16px_rgb(0_0_0/0.18)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {!dismissed && <SeenBadge seen={seen} />}
            {dismissed && ev && hideBelow > 0 && ev.score < hideBelow && <span className="mono text-faint">Nascosta: AI sotto {hideBelow}</span>}
            {ev && <ChanceTag chance={ev.chance} />}
            {(job.hasTailored || t) && (
              <span className="mono inline-flex items-center gap-1 text-good">
                <Icon name="check" className="size-3" strokeWidth={2.4} />
                CV pronto
              </span>
            )}
          </div>
          <h2 className={`text-[17px] font-semibold leading-snug tracking-[-0.015em] ${seen ? "text-slate-300" : "text-ink"}`}>{job.title}</h2>
          <p className="mt-0.5 text-[15px] text-muted">
            <span className="font-medium text-slate-200">{job.company}</span>
            {job.location ? <> ∙ {job.location}</> : null}
          </p>
        </div>
        <MatchTag score={score} ai={!!ev} />
      </div>

      <div className="mono flex flex-wrap items-center gap-x-2.5 gap-y-1 text-faint">
        {MODE[job.workMode] && <span>{MODE[job.workMode]}</span>}
        {job.salary && <span className="normal-case tracking-normal">{job.salary}</span>}
        {job.postedAt && <span>{daysAgo(job.postedAt)}</span>}
        <ViaSource source={job.source} url={job.sourceUrl} />
      </div>

      {ev?.summary ? (
        <p className="text-[15px] leading-relaxed text-slate-300">{ev.summary}</p>
      ) : m ? (
        <CvReason match={m} />
      ) : null}

      {dismissed ? (
        <div className="flex gap-2">
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1">
            <Icon name="external" className="size-4" />
            Apri annuncio
          </a>
          <button className="btn-primary flex-1" disabled={!!busy} onClick={() => act("restore")}>
            <Icon name="undo" className="size-4" />
            Ripristina
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-secondary min-w-0 flex-1 px-2" onClick={markSeenOnOpen} aria-label="Apri annuncio">
            <Icon name="external" className="size-4 shrink-0" />
            Annuncio
          </a>
          <button className="btn-success min-w-0 flex-1 px-2" disabled={!!busy} onClick={() => act("apply")}>
            <Icon name="check" className="size-4" />
            Candidato
          </button>
          <button
            className="btn-icon"
            onClick={() => onSeen(job, !seen)}
            aria-label={seen ? "Segna come da vedere" : "Segna come vista"}
            title={seen ? "Segna come da vedere" : "Segna come vista"}
          >
            <Icon name={seen ? "eyeOff" : "eye"} className="size-[18px]" />
          </button>
          <button className="btn-icon hover:text-bad" disabled={!!busy} onClick={() => act("dismiss")} aria-label="Non mi interessa" title="Non mi interessa">
            <Icon name="x" className="size-[18px]" />
          </button>
        </div>
      )}

      <button
        onClick={toggle}
        aria-expanded={open}
        className="-mb-1 flex min-h-9 w-full items-center justify-center gap-1 rounded-full text-[13px] font-medium text-muted transition-colors duration-150 hover:bg-panel-2 hover:text-ink"
      >
        {open ? "Meno dettagli" : "Dettagli, CV e lettera"}
        <Icon name="chevron" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <ErrorBox error={err} />

      {open && (
        <div className="space-y-4 border-t border-line pt-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <a
              href={companySearchUrl(job.company, job.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              title="Cerca lo stesso annuncio sulla pagina careers dell'azienda"
            >
              <Icon name="globe" className="size-4" />
              Sito dell&apos;azienda
            </a>
            <button className="btn-secondary" disabled={!!busy} onClick={() => act("evaluate")}>
              <Icon name={ev ? "refresh" : "sparkle"} className="size-4" />
              {busy === "evaluate" ? "Valuto…" : ev ? "Rivaluta con AI" : "Valuta con AI"}
            </button>
            {!(job.hasTailored || t) && (
              <button className="btn-primary" disabled={!!busy} onClick={() => act("tailor")}>
                <Icon name="sparkle" className="size-4" />
                {busy === "tailor" ? "Preparo…" : "Prepara CV e lettera"}
              </button>
            )}
          </div>

          {ev && (
            <div className="grid gap-4 sm:grid-cols-3">
              <List title="Punti di forza" items={ev.strengths} dot="bg-good" />
              <List title="Cosa manca" items={ev.gaps} dot="bg-amber" />
              <List title="Ostacoli" items={ev.obstacles} dot="bg-bad" />
            </div>
          )}
          {job.match && (
            <p className="text-xs leading-relaxed text-muted">
              Stima rapida dal CV {job.match.score}/100: titolo {job.match.titleScore}%
              {job.match.titleMatch ? ` (vicino a «${job.match.titleMatch}»)` : ""}, competenze del CV trovate{" "}
              {job.match.skillsFound.join(", ") || "nessuna"}
              {job.match.keywordsFound?.length ? `, parole chiave: ${job.match.keywordsFound.join(", ")}` : ""}
              {job.match.yearsRequired != null ? `, richiede ${job.match.yearsRequired}+ anni` : ""}
              {job.match.notes.length ? `. ${job.match.notes.join("; ")}` : ""}
            </p>
          )}

          {(job.hasTailored || t) && (
            <div className="space-y-3 rounded-xl bg-rail p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">
                  CV su misura {t && <span className="text-muted">({t.language.toUpperCase()})</span>}
                </h3>
                <button className="btn-ghost min-h-9 px-2 text-xs" disabled={!!busy} onClick={() => act("tailor")}>
                  <Icon name="refresh" className="size-3.5" />
                  {busy === "tailor" ? "Rigenero…" : "Rigenera"}
                </button>
              </div>
              {t?.cv.headline && <p className="text-slate-300">{t.cv.headline}</p>}
              <div className="grid grid-cols-2 gap-2">
                <a className="btn-secondary" href={dl("cv", "pdf")}><Icon name="download" className="size-4" />CV PDF</a>
                <a className="btn-secondary" href={dl("cv", "docx")}>CV Word</a>
                <a className="btn-secondary" href={dl("letter", "pdf")}><Icon name="download" className="size-4" />Lettera PDF</a>
                <a className="btn-secondary" href={dl("letter", "docx")}>Lettera Word</a>
              </div>
              {t &&
                (t.corrections.length > 0 ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-signal">
                      {t.corrections.length} correzioni anti-invenzione applicate
                    </summary>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
                      {t.corrections.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <p className="text-xs text-good">Controllo anti-invenzione: nessuna correzione necessaria</p>
                ))}
              {t && <LetterBox letter={t.letter} />}
            </div>
          )}

          {detail ? (
            <details>
              <summary className="cursor-pointer font-semibold">Testo dell&apos;annuncio</summary>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-300">{detail.job.description}</p>
            </details>
          ) : (
            <p className="text-muted">Caricamento…</p>
          )}
        </div>
      )}
    </article>
  );
}

const CHANCE_DOT: Record<string, string> = { alta: "bg-good", media: "bg-amber", bassa: "bg-bad" };

function ChanceTag({ chance }: { chance: string }) {
  return (
    <span className="mono inline-flex items-center gap-1.5 text-muted">
      <span className={`size-1.5 rounded-full ${CHANCE_DOT[chance] ?? "bg-faint"}`} aria-hidden="true" />
      chance {chance}
    </span>
  );
}

/** Perché questa offerta: il titolo del CV più vicino e le competenze del CV trovate nell'annuncio. */
function CvReason({ match }: { match: MatchDetails }) {
  const skills = match.skillsFound.slice(0, 5);
  const more = match.skillsFound.length - skills.length;
  if (!match.titleMatch && !skills.length && !match.notes.length) return null;
  return (
    <div className="space-y-2">
      {(match.titleMatch || skills.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mono mr-1 text-faint">Dal tuo CV</span>
          {match.titleMatch && match.titleScore >= 50 && <span className="chip border-ink text-ink">{match.titleMatch}</span>}
          {skills.map((s) => (
            <span key={s} className="chip">{s}</span>
          ))}
          {more > 0 && <span className="font-mono text-xs text-faint">+{more}</span>}
        </div>
      )}
      {match.notes.length > 0 && <p className="text-[13px] text-amber">{match.notes.join(" ∙ ")}</p>}
    </div>
  );
}

function List({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  return (
    <div>
      <h4 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold">
        <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
        {title}
      </h4>
      {items.length ? (
        <ul className="space-y-1 text-slate-300">
          {items.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">Nessuno</p>
      )}
    </div>
  );
}

function LetterBox({ letter }: { letter: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">Lettera</span>
        <button
          className="btn-ghost min-h-9 px-2 text-xs"
          onClick={async () => {
            await navigator.clipboard.writeText(letter);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <Icon name={copied ? "check" : "copy"} className="size-3.5" />
          {copied ? "Copiata" : "Copia testo"}
        </button>
      </div>
      <textarea readOnly className="input h-48 font-serif text-[15px] leading-relaxed" value={letter} />
    </div>
  );
}
