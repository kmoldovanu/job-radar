"use client";

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (res.status === 401 && typeof window !== "undefined" && !url.includes("/api/auth/")) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Errore ${res.status}`);
  return data as T;
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export function daysAgo(d: string | Date | null | undefined): string {
  if (!d) return "";
  const n = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  return n <= 0 ? "oggi" : n === 1 ? "ieri" : `${n} giorni fa`;
}

/** Ricerca Google già compilata per trovare l'annuncio sul sito dell'azienda. */
export function companySearchUrl(company: string, title: string): string {
  const q = `"${company}" ${title} careers`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}
