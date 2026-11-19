"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { ErrorBox, PageHeader } from "@/components/ui";
import { api } from "@/lib/client";
import { emptyProfile, LANGUAGE_LEVELS, type CvIndex, type Profile } from "@/lib/types";

interface CvFile {
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

const csv = (a: string[]) => a.join(", ");
const fromCsv = (s: string) =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
const lines = (s: string) =>
  s
    .split("\n")
    .map((x) => x.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

export default function ProfilePage() {
  const [p, setP] = useState<Profile | null>(null);
  const [exists, setExists] = useState(false);
  const [cvFile, setCvFile] = useState<CvFile | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api<{ profile: Profile; exists: boolean; cvFile: CvFile | null }>("/api/profile")
      .then((r) => {
        setP(r.profile);
        setExists(r.exists);
        setCvFile(r.cvFile);
      })
      .catch((e) => {
        setErr(e.message);
        setP(emptyProfile());
      });
  }, []);

  async function upload(file: File) {
    setBusy("upload");
    setErr("");
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore");
      setP(data.profile);
      setExists(true);
      setCvFile(data.cvFile);
      const rescored = data.rescored ? ` Ho ricalcolato il punteggio di ${data.rescored} offerte già trovate.` : "";
      setMsg(
        data.ai
          ? `CV salvato e letto: ricerca e punteggi ora partono da qui.${rescored} Controlla i dati qui sotto e correggi se serve.`
          : `CV salvato. Senza chiave Anthropic l'indice di ricerca viene dalle parole del CV; il profilo va compilato a mano.${rescored}`,
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function save() {
    if (!p) return;
    setBusy("save");
    setErr("");
    setMsg("");
    try {
      const r = await api<{ rescored: number }>("/api/profile", { method: "PUT", json: p });
      setExists(true);
      setMsg(r.rescored ? `Profilo salvato. Punteggio ricalcolato su ${r.rescored} offerte.` : "Profilo salvato.");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  if (!p) return <p className="text-slate-500">Caricamento…</p>;
  const up = (patch: Partial<Profile>) => setP({ ...p, ...patch });
  const pref = (patch: Partial<Profile["preferences"]>) => setP({ ...p, preferences: { ...p.preferences, ...patch } });

  return (
    <div className="space-y-4">
      <PageHeader title="Profilo" subtitle="Il tuo CV master e cosa cerchi" />

      <section className="card space-y-4" aria-labelledby="cv">
        <div className="flex items-start gap-3.5">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-signal/12 text-signal">
            <Icon name="file" className="size-6" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="cv" className="text-lg font-semibold">Il tuo CV</h2>
            {cvFile ? (
              <>
                <p className="break-all text-[15px] font-semibold text-ink">{cvFile.name}</p>
                <p className="text-sm text-muted">
                  {fmtSize(cvFile.size)} ∙ caricato il{" "}
                  {new Date(cvFile.uploadedAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">PDF o Word (.docx). Lo salvo così com&apos;è: ricerca e punteggi partono da qui.</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className={`${cvFile ? "btn-secondary" : "btn-primary"} cursor-pointer has-[:disabled]:opacity-40`}>
            <Icon name="upload" className="size-4" strokeWidth={2.2} />
            {busy === "upload" ? "Lettura del CV…" : cvFile ? "Carica un nuovo CV" : "Carica il tuo CV"}
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              disabled={!!busy}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
          {cvFile && (
            <a className="btn-secondary" href="/api/profile/cv" target="_blank" rel="noopener noreferrer">
              <Icon name="external" className="size-4" />
              Apri il CV
            </a>
          )}
        </div>
        {exists && <p className="text-[13px] text-muted">Con un nuovo CV i dati qui sotto vengono sostituiti; le preferenze di ricerca restano.</p>}
      </section>

      {msg && (
        <p role="status" className="rounded-xl border border-good/30 bg-good/10 p-3 text-sm text-[#bbf7d0]">
          {msg}
        </p>
      )}
      <ErrorBox error={err} />

      {p.cvIndex && <CvIndexCard index={p.cvIndex} />}

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Cosa cerchi</h2>
        <Field label={p.cvIndex ? "Altri ruoli che cerchi (si aggiungono ai titoli presi dal CV)" : "Ruoli che cerchi (separati da virgola, in inglese funzionano meglio)"}>
          <TextList value={p.preferences.targetRoles} onChange={(v) => pref({ targetRoles: v })} placeholder="Data Analyst, Business Analyst" />
        </Field>
        <Field label="Parole da escludere">
          <TextList value={p.preferences.excludeKeywords} onChange={(v) => pref({ excludeKeywords: v })} placeholder="sales, call center, unpaid" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Anni di esperienza">
            <input type="number" min={0} className="input" value={p.preferences.yearsExperience} onChange={(e) => pref({ yearsExperience: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Seniority">
            <select className="input" value={p.preferences.seniority} onChange={(e) => pref({ seniority: e.target.value as Profile["preferences"]["seniority"] })}>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead / Manager</option>
            </select>
          </Field>
        </div>
        <Field label="Modalità di lavoro">
          <div className="flex flex-wrap gap-3 text-sm">
            {(
              [
                ["remote", "Remoto"],
                ["hybrid", "Ibrido"],
                ["onsite", "In sede"],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="flex items-center gap-1.5">
                <input
                  type="checkbox" className="size-5 accent-ink"
                  checked={p.preferences.workModes.includes(k)}
                  onChange={(e) =>
                    pref({ workModes: e.target.checked ? [...p.preferences.workModes, k] : p.preferences.workModes.filter((x) => x !== k) })
                  }
                />
                {l}
              </label>
            ))}
          </div>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-5 accent-ink" checked={p.preferences.willingToRelocate} onChange={(e) => pref({ willingToRelocate: e.target.checked })} />
          Sono disponibile a trasferirmi all&apos;estero
        </label>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Dati personali</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome">
            <input className="input" value={p.name} onChange={(e) => up({ name: e.target.value })} />
          </Field>
          <Field label="Titolo professionale">
            <input className="input" value={p.headline} onChange={(e) => up({ headline: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className="input" value={p.email} onChange={(e) => up({ email: e.target.value })} />
          </Field>
          <Field label="Telefono">
            <input className="input" value={p.phone} onChange={(e) => up({ phone: e.target.value })} />
          </Field>
          <Field label="Città">
            <input className="input" value={p.location} onChange={(e) => up({ location: e.target.value })} />
          </Field>
          <Field label="Link (LinkedIn, portfolio…)">
            <TextList value={p.links} onChange={(v) => up({ links: v })} />
          </Field>
        </div>
        <Field label="Profilo / sommario">
          <textarea className="input h-24" value={p.summary} onChange={(e) => up({ summary: e.target.value })} />
        </Field>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Lingue</h2>
        <p className="text-sm text-muted">Servono a scartare le offerte che richiedono lingue che non parli almeno a livello B2.</p>
        {p.languages.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input"
              placeholder="Lingua (es. Inglese)"
              value={l.name}
              onChange={(e) => up({ languages: p.languages.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
            />
            <input
              className="input w-20"
              placeholder="it"
              title="Codice ISO (it, en, de…)"
              value={l.code}
              onChange={(e) => up({ languages: p.languages.map((x, j) => (j === i ? { ...x, code: e.target.value.toLowerCase().slice(0, 2) } : x)) })}
            />
            <select
              className="input w-28"
              value={l.level}
              onChange={(e) =>
                up({ languages: p.languages.map((x, j) => (j === i ? { ...x, level: e.target.value as (typeof LANGUAGE_LEVELS)[number] } : x)) })
              }
            >
              {LANGUAGE_LEVELS.map((lv) => (
                <option key={lv} value={lv}>
                  {lv === "native" ? "madrelingua" : lv}
                </option>
              ))}
            </select>
            <button className="btn-ghost" onClick={() => up({ languages: p.languages.filter((_, j) => j !== i) })}>
              ✕
            </button>
          </div>
        ))}
        <button className="btn-ghost" onClick={() => up({ languages: [...p.languages, { name: "", code: "", level: "B2" }] })}>
          + Lingua
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Competenze e certificazioni</h2>
        <Field label="Competenze (separate da virgola)">
          <TextList value={p.skills} onChange={(v) => up({ skills: v })} area />
        </Field>
        <Field label="Certificazioni">
          <TextList value={p.certifications} onChange={(v) => up({ certifications: v })} />
        </Field>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Esperienze</h2>
        {p.experience.map((x, i) => {
          const set = (patch: Partial<typeof x>) => up({ experience: p.experience.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
          return (
            <div key={i} className="space-y-2 rounded-xl bg-rail p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <input className="input" placeholder="Azienda" value={x.company} onChange={(e) => set({ company: e.target.value })} />
                <input className="input" placeholder="Ruolo" value={x.role} onChange={(e) => set({ role: e.target.value })} />
                <input className="input" placeholder="Inizio (es. 03/2021)" value={x.start} onChange={(e) => set({ start: e.target.value })} />
                <input className="input" placeholder="Fine (vuoto = oggi)" value={x.end} onChange={(e) => set({ end: e.target.value })} />
              </div>
              <input className="input" placeholder="Località" value={x.location} onChange={(e) => set({ location: e.target.value })} />
              <Lines value={x.bullets} onChange={(v) => set({ bullets: v })} placeholder="Un risultato o attività per riga" />
              <button className="btn-ghost text-xs text-bad" onClick={() => up({ experience: p.experience.filter((_, j) => j !== i) })}>
                Elimina esperienza
              </button>
            </div>
          );
        })}
        <button className="btn-ghost" onClick={() => up({ experience: [...p.experience, { company: "", role: "", location: "", start: "", end: "", bullets: [] }] })}>
          + Esperienza
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Formazione</h2>
        {p.education.map((x, i) => {
          const set = (patch: Partial<typeof x>) => up({ education: p.education.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
          return (
            <div key={i} className="space-y-2 rounded-xl bg-rail p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <input className="input" placeholder="Istituto" value={x.institution} onChange={(e) => set({ institution: e.target.value })} />
                <input className="input" placeholder="Titolo" value={x.degree} onChange={(e) => set({ degree: e.target.value })} />
                <input className="input" placeholder="Inizio" value={x.start} onChange={(e) => set({ start: e.target.value })} />
                <input className="input" placeholder="Fine" value={x.end} onChange={(e) => set({ end: e.target.value })} />
              </div>
              <input className="input" placeholder="Dettagli (voto, tesi…)" value={x.details} onChange={(e) => set({ details: e.target.value })} />
              <button className="btn-ghost text-xs text-bad" onClick={() => up({ education: p.education.filter((_, j) => j !== i) })}>
                Elimina
              </button>
            </div>
          );
        })}
        <button className="btn-ghost" onClick={() => up({ education: [...p.education, { institution: "", degree: "", start: "", end: "", details: "" }] })}>
          + Formazione
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Progetti</h2>
        {p.projects.map((x, i) => {
          const set = (patch: Partial<typeof x>) => up({ projects: p.projects.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
          return (
            <div key={i} className="space-y-2 rounded-xl bg-rail p-4">
              <input className="input" placeholder="Nome progetto" value={x.name} onChange={(e) => set({ name: e.target.value })} />
              <input className="input" placeholder="Descrizione" value={x.description} onChange={(e) => set({ description: e.target.value })} />
              <Lines value={x.bullets} onChange={(v) => set({ bullets: v })} placeholder="Punti elenco, uno per riga" />
              <button className="btn-ghost text-xs text-bad" onClick={() => up({ projects: p.projects.filter((_, j) => j !== i) })}>
                Elimina
              </button>
            </div>
          );
        })}
        <button className="btn-ghost" onClick={() => up({ projects: [...p.projects, { name: "", description: "", bullets: [] }] })}>
          + Progetto
        </button>
      </section>

      <div className="sticky bottom-20 z-10 md:bottom-4">
        <button className="btn-primary min-h-12 w-full text-[15px] shadow-[0_12px_32px_-12px_rgb(0_0_0/0.4)]" disabled={!!busy} onClick={save}>
          {busy === "save" ? "Salvataggio…" : "Salva profilo"}
        </button>
      </div>
    </div>
  );
}

function fmtSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Cosa la ricerca e il punteggio hanno capito dal CV: titoli, competenze con sinonimi, settori. */
function CvIndexCard({ index }: { index: CvIndex }) {
  const skills = [...index.skills].sort((a, b) => b.weight - a.weight);
  return (
    <section className="card space-y-4" aria-labelledby="capito">
      <div>
        <h2 id="capito" className="text-lg font-semibold">Cosa ho capito dal tuo CV</h2>
        <p className="mt-0.5 text-sm text-muted">
          {index.source === "ai"
            ? "Letto dall'AI. La ricerca usa questi titoli come parole chiave e il punteggio cerca queste competenze negli annunci, anche tradotte."
            : "Ricavato dalle parole che il CV ripete (senza AI). Con la chiave Anthropic l'indice diventa molto più preciso."}
        </p>
      </div>
      {index.titles.length > 0 && (
        <div>
          <h3 className="label">Titoli per cui cerco</h3>
          <div className="flex flex-wrap gap-1.5">
            {index.titles.map((t) => (
              <span key={t} className="chip border-ink py-1 text-[13px] text-ink">{t}</span>
            ))}
          </div>
        </div>
      )}
      {skills.length > 0 && (
        <div>
          <h3 className="label">Competenze che cerco negli annunci</h3>
          <ul className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <li
                key={s.name}
                title={s.aliases.length ? `Anche: ${s.aliases.join(", ")}` : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] font-medium ${s.weight === 3 ? "border-ink bg-ink text-night" : "border-line-strong text-slate-300"}`}
              >
                {s.name}
                {s.aliases.length > 0 && <span className={`font-mono text-[11px] ${s.weight === 3 ? "text-night/60" : "text-faint"}`}>+{s.aliases.length}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-faint">In nero quelle centrali nel tuo lavoro; +N sono i sinonimi e le traduzioni che riconosco.</p>
        </div>
      )}
      {(index.domains.length > 0 || index.keywords.length > 0) && (
        <div>
          <h3 className="label">Settori e parole chiave</h3>
          <p className="text-sm leading-relaxed text-slate-300">{[...index.domains, ...index.keywords].join(" ∙ ")}</p>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}

/** Lista separata da virgole: il testo resta libero mentre scrivi, si converte quando esci dal campo. */
function TextList({ value, onChange, placeholder, area }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; area?: boolean }) {
  const [text, setText] = useState(csv(value));
  useEffect(() => setText(csv(value)), [value]);
  const props = {
    className: `input ${area ? "h-24" : ""}`,
    value: text,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(e.target.value),
    onBlur: () => onChange(fromCsv(text)),
  };
  return area ? <textarea {...props} /> : <input {...props} />;
}

function Lines({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState(value.join("\n"));
  useEffect(() => setText(value.join("\n")), [value]);
  return <textarea className="input h-28" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onBlur={() => onChange(lines(text))} />;
}
