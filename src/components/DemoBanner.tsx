"use client";

/** Striscia in cima a ogni pagina della demo: dice che i dati sono di esempio e permette di uscire. */
export function DemoBanner() {
  async function exit() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="border-b border-signal/25 bg-signal/10 text-[13px] text-slate-300">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
        <p className="mr-auto">
          <span className="mono mr-1.5 rounded-full border border-signal/50 px-2 py-0.5 text-signal">Demo</span> dati di esempio, si azzerano ogni notte. Ricerca e AI
          sono disattivate.
        </p>
        <button type="button" onClick={exit} className="font-medium text-ink underline underline-offset-4">
          Esci
        </button>
      </div>
    </div>
  );
}
