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
      <header className="pt-safe sticky top-0 z-20 border-b border-line bg-night/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-1 px-4">
          <Link href="/" className="mr-auto flex items-center gap-2" aria-label="JobRadar, vai alle offerte">
            <RadarMark className="size-7" />
            <span className="text-[18px] font-extrabold tracking-[-0.02em]">JobRadar</span>
          </Link>
          {/* desktop */}
          <nav className="hidden gap-1 md:flex" aria-label="Sezioni">
            {ITEMS.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={active(i.href) ? "page" : undefined}
                className={`relative flex h-14 items-center px-3 text-sm font-semibold transition-colors duration-150 ${active(i.href) ? "text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-signal" : "text-muted hover:text-ink"}`}
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
        className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-night/95 backdrop-blur-md md:hidden"
      >
        <div className="grid grid-cols-5">
          {ITEMS.map((i) => {
            const on = active(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={on ? "page" : undefined}
                className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] ${on ? "text-ink before:absolute before:inset-x-5 before:top-0 before:h-[3px] before:rounded-b-full before:bg-signal" : "text-muted"}`}
              >
                <Icon name={i.icon} className={`size-[22px] ${on ? "text-signal" : ""}`} strokeWidth={on ? 2.2 : 1.7} />
                <span className={on ? "font-bold" : "font-medium"}>{i.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
