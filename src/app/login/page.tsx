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

  return (
    <form onSubmit={submit} className="pt-safe mx-auto mt-[12vh] max-w-sm space-y-5">
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
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
