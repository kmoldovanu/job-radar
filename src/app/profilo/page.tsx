"use client";

import { useEffect, useState } from "react";
import { ErrorBox } from "@/components/ui";
import { api } from "@/lib/client";
import { emptyProfile, LANGUAGE_LEVELS, type Profile } from "@/lib/types";

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
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api<{ profile: Profile; exists: boolean }>("/api/profile")
      .then((r) => {
        setP(r.profile);
        setExists(r.exists);
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
      setMsg(
        data.ai
          ? "CV letto! Controlla i dati qui sotto, correggi se serve e salva."
          : "Testo del CV salvato. Senza chiave Anthropic devi compilare il profilo a mano.",
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
      await api("/api/profile", { method: "PUT", json: p });
      setExists(true);
      setMsg("Profilo salvato ✓");
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
      <h1 className="text-2xl font-bold">Profilo</h1>

      <div className="card space-y-2">
        <h2 className="font-semibold">{exists ? "Ricarica il CV" : "1. Carica il tuo CV"}</h2>
        <p className="text-sm text-slate-500">PDF o Word (.docx). L&apos;AI lo trasforma nel tuo CV master, che puoi modificare.</p>
        <label className="btn-primary cursor-pointer">
          {busy === "upload" ? "Lettura in corso…" : "📄 Scegli file"}
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            disabled={!!busy}
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </label>
        {exists && <p className="text-xs text-amber-700">Ricaricando il CV i dati qui sotto verranno sostituiti (le preferenze di ricerca restano).</p>}
      </div>

      {msg && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{msg}</p>}
      <ErrorBox error={err} />

      <section className="card space-y-3">
        <h2 className="font-semibold">Cosa cerchi</h2>
        <Field label="Ruoli che cerchi (separati da virgola, in inglese funzionano meglio)">
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
                  type="checkbox"
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
          <input type="checkbox" checked={p.preferences.willingToRelocate} onChange={(e) => pref({ willingToRelocate: e.target.checked })} />
          Sono disponibile a trasferirmi all&apos;estero
        </label>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Dati personali</h2>
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
        <h2 className="font-semibold">Lingue</h2>
        <p className="text-xs text-slate-500">Servono a scartare le offerte che richiedono lingue che non parli almeno a livello B2.</p>
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
        <h2 className="font-semibold">Competenze e certificazioni</h2>
        <Field label="Competenze (separate da virgola)">
          <TextList value={p.skills} onChange={(v) => up({ skills: v })} area />
        </Field>
        <Field label="Certificazioni">
          <TextList value={p.certifications} onChange={(v) => up({ certifications: v })} />
        </Field>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Esperienze</h2>
        {p.experience.map((x, i) => {
          const set = (patch: Partial<typeof x>) => up({ experience: p.experience.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
          return (
            <div key={i} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="grid gap-2 sm:grid-cols-2">
                <input className="input" placeholder="Azienda" value={x.company} onChange={(e) => set({ company: e.target.value })} />
                <input className="input" placeholder="Ruolo" value={x.role} onChange={(e) => set({ role: e.target.value })} />
                <input className="input" placeholder="Inizio (es. 03/2021)" value={x.start} onChange={(e) => set({ start: e.target.value })} />
                <input className="input" placeholder="Fine (vuoto = oggi)" value={x.end} onChange={(e) => set({ end: e.target.value })} />
              </div>
              <input className="input" placeholder="Località" value={x.location} onChange={(e) => set({ location: e.target.value })} />
              <Lines value={x.bullets} onChange={(v) => set({ bullets: v })} placeholder="Un risultato o attività per riga" />
              <button className="btn-ghost text-xs text-red-600" onClick={() => up({ experience: p.experience.filter((_, j) => j !== i) })}>
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
        <h2 className="font-semibold">Formazione</h2>
        {p.education.map((x, i) => {
          const set = (patch: Partial<typeof x>) => up({ education: p.education.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
          return (
            <div key={i} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="grid gap-2 sm:grid-cols-2">
                <input className="input" placeholder="Istituto" value={x.institution} onChange={(e) => set({ institution: e.target.value })} />
                <input className="input" placeholder="Titolo" value={x.degree} onChange={(e) => set({ degree: e.target.value })} />
                <input className="input" placeholder="Inizio" value={x.start} onChange={(e) => set({ start: e.target.value })} />
                <input className="input" placeholder="Fine" value={x.end} onChange={(e) => set({ end: e.target.value })} />
              </div>
              <input className="input" placeholder="Dettagli (voto, tesi…)" value={x.details} onChange={(e) => set({ details: e.target.value })} />
              <button className="btn-ghost text-xs text-red-600" onClick={() => up({ education: p.education.filter((_, j) => j !== i) })}>
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
        <h2 className="font-semibold">Progetti</h2>
        {p.projects.map((x, i) => {
          const set = (patch: Partial<typeof x>) => up({ projects: p.projects.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
          return (
            <div key={i} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <input className="input" placeholder="Nome progetto" value={x.name} onChange={(e) => set({ name: e.target.value })} />
              <input className="input" placeholder="Descrizione" value={x.description} onChange={(e) => set({ description: e.target.value })} />
              <Lines value={x.bullets} onChange={(v) => set({ bullets: v })} placeholder="Punti elenco, uno per riga" />
              <button className="btn-ghost text-xs text-red-600" onClick={() => up({ projects: p.projects.filter((_, j) => j !== i) })}>
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
        <button className="btn-primary w-full py-3 text-base shadow-lg" disabled={!!busy} onClick={save}>
          {busy === "save" ? "Salvataggio…" : "💾 Salva profilo"}
        </button>
      </div>
    </div>
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
