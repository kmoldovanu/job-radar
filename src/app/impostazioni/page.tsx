"use client";

import { useEffect, useState } from "react";
import { ErrorBox } from "@/components/ui";
import { api } from "@/lib/client";
import { ADZUNA_COUNTRIES, type Settings } from "@/lib/types";

const COUNTRY_LABEL: Record<string, string> = {
  gb: "🇬🇧 Regno Unito", us: "🇺🇸 USA", de: "🇩🇪 Germania", fr: "🇫🇷 Francia", it: "🇮🇹 Italia", nl: "🇳🇱 Paesi Bassi",
  es: "🇪🇸 Spagna", at: "🇦🇹 Austria", be: "🇧🇪 Belgio", ch: "🇨🇭 Svizzera", pl: "🇵🇱 Polonia", ca: "🇨🇦 Canada",
  au: "🇦🇺 Australia", nz: "🇳🇿 Nuova Zelanda", sg: "🇸🇬 Singapore", in: "🇮🇳 India", mx: "🇲🇽 Messico",
  br: "🇧🇷 Brasile", za: "🇿🇦 Sudafrica",
};

const SOURCES: [keyof Settings["sources"], string, string][] = [
  ["himalayas", "Himalayas", "lavori remoti"],
  ["remoteok", "Remote OK", "lavori remoti"],
  ["jobicy", "Jobicy", "lavori remoti"],
  ["jooble", "Jooble", "aggregatore mondiale (serve chiave gratuita)"],
  ["themuse", "The Muse", "aziende internazionali, remoto ed Europa"],
  ["arbeitnow", "Arbeitnow", "Europa, con info sul visto"],
  ["adzuna", "Adzuna", "annunci per paese (serve chiave gratuita)"],
  ["companies", "Pagine carriere", "aziende aggiunte in Cerca"],
];

const ENV_HELP: Record<string, string> = {
  DATABASE_URL: "Database Postgres (obbligatoria)",
  APP_PASSWORD: "Password di accesso (obbligatoria)",
  SESSION_SECRET: "Firma del cookie, min. 16 caratteri (obbligatoria)",
  ANTHROPIC_API_KEY: "AI: valutazioni e CV su misura (facoltativa)",
  ADZUNA_APP_ID: "Fonte Adzuna (facoltativa)",
  ADZUNA_APP_KEY: "Fonte Adzuna (facoltativa)",
  JOOBLE_API_KEY: "Fonte Jooble (facoltativa)",
  THEMUSE_API_KEY: "The Muse: limiti più alti (facoltativa, funziona anche senza)",
  CRON_SECRET: "Ricerca automatica ogni mattina (facoltativa)",
};

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [env, setEnv] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ settings: Settings; env: Record<string, boolean> }>("/api/settings")
      .then((r) => {
        setS(r.settings);
        setEnv(r.env);
      })
      .catch((e) => setErr(e.message));
  }, []);

  async function save() {
    if (!s) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await api("/api/settings", { method: "PUT", json: s });
      setMsg("Impostazioni salvate ✓");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (!s) return err ? <ErrorBox error={err} /> : <p className="text-slate-500">Caricamento…</p>;
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) || 0 });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Impostazioni</h1>

      <section className="card space-y-2">
        <h2 className="font-semibold">Fonti attive</h2>
        {SOURCES.map(([k, name, desc]) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.sources[k]} onChange={(e) => setS({ ...s, sources: { ...s.sources, [k]: e.target.checked } })} />
            <b>{name}</b> <span className="text-slate-500">— {desc}</span>
          </label>
        ))}
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Paesi Adzuna</h2>
        <p className="text-xs text-slate-500">Una richiesta per paese. Fuori dall&apos;UE/SEE/Svizzera restano solo le offerte che parlano di sponsor del visto.</p>
        <div className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
          {ADZUNA_COUNTRIES.map((c) => (
            <label key={c} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.adzunaCountries.includes(c)}
                onChange={(e) =>
                  setS({ ...s, adzunaCountries: e.target.checked ? [...s.adzunaCountries, c] : s.adzunaCountries.filter((x) => x !== c) })
                }
              />
              {COUNTRY_LABEL[c]}
            </label>
          ))}
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Località Jooble</h2>
        <p className="text-xs text-slate-500">
          Una richiesta per località a ogni ricerca, con il primo ruolo del profilo. La chiave gratuita di Jooble ha un numero
          limitato di richieste: meglio poche località (es. Remote, Italy, Germany).
        </p>
        <JoobleLocations value={s.joobleLocations} onChange={(v) => setS({ ...s, joobleLocations: v })} />
      </section>

      <section className="card grid grid-cols-2 gap-3">
        <h2 className="col-span-2 font-semibold">Soglie</h2>
        <NumField label="Età massima annunci (giorni)" value={s.maxAgeDays} onChange={num("maxAgeDays")} />
        <NumField label="Match rapido minimo (0-100)" value={s.minQuickScore} onChange={num("minQuickScore")} />
        <NumField label="Offerte da valutare con AI" value={s.aiEvaluateTop} onChange={num("aiEvaluateTop")} />
        <NumField label="Candidature da preparare" value={s.prepareCount} onChange={num("prepareCount")} />
        <NumField label="Promemoria follow-up (giorni)" value={s.followUpDays} onChange={num("followUpDays")} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Modelli AI</h2>
        <label className="block">
          <span className="label">Modello veloce (valutazione)</span>
          <input className="input font-mono" value={s.evalModel} onChange={(e) => setS({ ...s, evalModel: e.target.value.trim() })} />
        </label>
        <label className="block">
          <span className="label">Modello migliore (CV e lettere)</span>
          <input className="input font-mono" value={s.writeModel} onChange={(e) => setS({ ...s, writeModel: e.target.value.trim() })} />
        </label>
      </section>

      <button className="btn-primary w-full py-3" disabled={busy} onClick={save}>
        {busy ? "Salvataggio…" : "💾 Salva impostazioni"}
      </button>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <ErrorBox error={err} />

      <section className="card space-y-2">
        <h2 className="font-semibold">Variabili d&apos;ambiente</h2>
        <ul className="space-y-1 text-sm">
          {Object.entries(env).map(([k, v]) => (
            <li key={k} className="flex items-start gap-2">
              <span>{v ? "✅" : "❌"}</span>
              <span>
                <code className="font-mono text-xs">{k}</code> <span className="text-slate-500">— {ENV_HELP[k]}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">I valori non vengono mai mostrati. Si impostano su Vercel → Settings → Environment Variables.</p>
      </section>

      <button className="btn-secondary w-full" onClick={logout}>
        Esci
      </button>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input type="number" className="input" value={value} onChange={onChange} />
    </label>
  );
}

function JoobleLocations({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join(", "));
  return (
    <input
      className="input"
      value={text}
      placeholder="Remote, Italy, Germany"
      onChange={(e) => setText(e.target.value)}
      onBlur={() =>
        onChange(
          text
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        )
      }
    />
  );
}
