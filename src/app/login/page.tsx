"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RadarMark } from "@/components/Icon";

function LoginForm() {
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
      <div className="mt-8 border-t border-line/70 pt-6">
        <p className="text-sm text-muted">Vuoi solo vedere come funziona?</p>
        {/* <a> e non <Link>: /demo è una route che imposta il cookie e reindirizza */}
        <a href="/demo" className="btn-secondary mt-3 w-full">
          Apri la demo con dati di esempio
        </a>
        {demoState === "off" && <p className="mt-3 text-sm text-bad">La demo non è attiva su questa installazione.</p>}
        {demoState === "error" && <p className="mt-3 text-sm text-bad">La demo non è disponibile in questo momento. Riprova tra poco.</p>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
