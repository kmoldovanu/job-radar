"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Offerte", icon: "📋" },
  { href: "/cerca", label: "Cerca", icon: "🔎" },
  { href: "/candidature", label: "Candidature", icon: "📨" },
  { href: "/profilo", label: "Profilo", icon: "👤" },
  { href: "/impostazioni", label: "Impostazioni", icon: "⚙️" },
];

export function Nav() {
  const path = usePathname();
  if (path === "/login") return null;
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      {/* desktop */}
      <header className="sticky top-0 z-20 hidden border-b border-slate-200 bg-white/90 backdrop-blur md:block dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-3xl items-center gap-1 px-4 py-2">
          <span className="mr-4 font-bold text-brand-600">📡 JobRadar</span>
          {ITEMS.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`rounded-lg px-3 py-1.5 text-sm ${active(i.href) ? "bg-brand-50 font-semibold text-brand-700 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            >
              {i.label}
            </Link>
          ))}
        </div>
      </header>
      {/* mobile */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/90">
        <span className="font-bold text-brand-600">📡 JobRadar</span>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {ITEMS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(i.href) ? "font-semibold text-brand-600" : "text-slate-500"}`}
          >
            <span className="text-lg leading-none">{i.icon}</span>
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
