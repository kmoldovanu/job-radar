"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, RadarMark, type IconName } from "./Icon";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Offerte", icon: "offers" },
  { href: "/cerca", label: "Cerca", icon: "search" },
  { href: "/candidature", label: "Candidature", icon: "send" },
  { href: "/profilo", label: "Profilo", icon: "user" },
  { href: "/impostazioni", label: "Impostazioni", icon: "gear" },
];

export function Nav() {
  const path = usePathname();
  if (path === "/login") return null;
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      <header className="pt-safe sticky top-0 z-20 border-b border-line/70 bg-night/85 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-1 px-4">
          <Link href="/" className="mr-auto flex items-center gap-2" aria-label="JobRadar, vai alle offerte">
            <RadarMark className="size-7" />
            <span className="font-display text-[17px] font-semibold tracking-tight">JobRadar</span>
          </Link>
          {/* desktop */}
          <nav className="hidden gap-1 md:flex" aria-label="Sezioni">
            {ITEMS.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={active(i.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${active(i.href) ? "bg-panel-2 text-ink" : "text-muted hover:text-ink"}`}
              >
                {i.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {/* telefono: barra in basso, sopra l'indicatore home dell'iPhone */}
      <nav
        aria-label="Sezioni"
        className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line/70 bg-night/90 backdrop-blur-xl md:hidden"
      >
        <div className="grid grid-cols-5">
          {ITEMS.map((i) => {
            const on = active(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10.5px] ${on ? "text-signal" : "text-muted"}`}
              >
                <Icon name={i.icon} className="size-[22px]" strokeWidth={on ? 2.1 : 1.7} />
                <span className={on ? "font-semibold" : ""}>{i.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
