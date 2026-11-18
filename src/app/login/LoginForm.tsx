"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RadarMark } from "@/components/Icon";

function LoginForm({ demoPassword }: { demoPassword: string | null }) {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const next = params.get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    } else {
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Errore");
      setBusy(false);
    }
  }

  const demoState = params.get("demo");

  return (
    <div className="pt-safe mx-auto mt-[12vh] max-w-sm">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <RadarMark className="size-14" />
          <h1 className="mt-4 text-[32px] font-semibold leading-tight tracking-tight">JobRadar</h1>
          <p className="text-muted">Area privata. Inserisci la password per entrare.</p>
        </div>
        <input
          type="password"
          className="input"
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-bad">{error}</p>}
        <button className="btn-primary w-full" disabled={busy || !password}>
          {busy ? "Accesso…" : "Entra"}
        </button>
      </form>
      {demoPassword ? (
        <div className="mt-8 rounded-2xl border border-line/70 bg-panel/60 p-4">
          <p className="font-semibold">Vuoi provare l'app?</p>
          <p className="mt-1 text-sm text-muted">
            Entra nella demo con la password <code className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-ink">{demoPassword}</code>:
            vedrai offerte, CV e candidature di esempio. Ricerca e AI sono disattivate.
          </p>
          {/* <a> e non <Link>: /demo è una route che imposta il cookie e reindirizza */}
          <a href="/demo" className="btn-secondary mt-3 w-full">
            Entra nella demo
          </a>
        </div>
      ) : null}
      {demoState === "off" && <p className="mt-3 text-sm text-bad">La demo non è attiva su questa installazione.</p>}
      {demoState === "error" && <p className="mt-3 text-sm text-bad">La demo non è disponibile in questo momento. Riprova tra poco.</p>}
    </div>
  );
}

export function LoginScreen({ demoPassword }: { demoPassword: string | null }) {
  return (
    <Suspense>
      <LoginForm demoPassword={demoPassword} />
    </Suspense>
  );
}
