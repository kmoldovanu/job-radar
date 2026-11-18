import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { DemoBanner } from "@/components/DemoBanner";
import { Nav } from "@/components/Nav";
import { DEMO_PREFIX, SESSION_COOKIE } from "@/lib/auth";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const head = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-head", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "JobRadar",
  description: "Trova offerte di lavoro in tutto il mondo, prepara CV su misura e traccia le candidature.",
  applicationName: "JobRadar",
  // black-translucent: su iPhone la barra di stato diventa trasparente sopra lo sfondo scuro
  appleWebApp: { capable: true, title: "JobRadar", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#0c1520",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // La firma l'ha già verificata il proxy: qui basta sapere che tipo di sessione è.
  const demo = (await cookies()).get(SESSION_COOKIE)?.value.startsWith(DEMO_PREFIX) ?? false;
  return (
    <html lang="it" className={`dark ${head.variable} ${body.variable}`}>
      <body className="min-h-dvh">
        <Nav />
        {demo && <DemoBanner />}
        <main className="mx-auto w-full max-w-3xl px-4 pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pt-6 md:pb-12">{children}</main>
        <RegisterSW />
      </body>
    </html>
  );
}
