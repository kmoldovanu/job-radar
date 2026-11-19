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
      {/* in alto: barra bianca a pillola che resta sospesa sopra la pagina */}
      <header className="pt-safe sticky top-0 z-20 bg-white/80 backdrop-blur-md md:bg-transparent md:px-4 md:pt-3 md:backdrop-blur-none">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-1 border-b border-line px-4 md:h-[58px] md:rounded-full md:border md:bg-white/90 md:pr-2 md:pl-5 md:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] md:backdrop-blur-md">
          <Link href="/" className="mr-auto flex items-center gap-2" aria-label="JobRadar, vai alle offerte">
            <RadarMark className="size-7" />
            <span className="text-[17px] font-semibold tracking-[-0.02em]">JobRadar</span>
          </Link>
          {/* desktop */}
          <nav className="hidden gap-0.5 md:flex" aria-label="Sezioni">
            {ITEMS.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={active(i.href) ? "page" : undefined}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${active(i.href) ? "bg-ink text-white" : "text-slate-300 hover:bg-panel-2 hover:text-ink"}`}
              >
                {i.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {/* telefono: barra in basso, sopra l'indicatore home dell'iPhone */}
      <nav aria-label="Sezioni" className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/90 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5">
          {ITEMS.map((i) => {
            const on = active(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={on ? "page" : undefined}
                className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-medium ${on ? "text-ink" : "text-faint"}`}
              >
                <span className="relative">
                  <Icon name={i.icon} className="size-[22px]" strokeWidth={on ? 2 : 1.6} />
                  {on && <span className="absolute -top-0.5 -right-1 size-1.5 rounded-full bg-signal" aria-hidden="true" />}
                </span>
                {i.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
