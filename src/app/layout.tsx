import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { DemoBanner } from "@/components/DemoBanner";
import { MotionProvider } from "@/components/motion";
import { Nav } from "@/components/Nav";
import { DEMO_PREFIX, SESSION_COOKIE } from "@/lib/auth";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

// Geist per i testi, Geist Mono per etichette e dati
const body = Geist({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const code = Geist_Mono({ subsets: ["latin"], variable: "--font-code", display: "swap" });

export const metadata: Metadata = {
  title: "JobRadar",
  description: "Trova offerte di lavoro in tutto il mondo, prepara CV su misura e traccia le candidature.",
  applicationName: "JobRadar",
    appleWebApp: { capable: true, title: "JobRadar", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#000000",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // La firma l'ha già verificata il proxy: qui basta sapere che tipo di sessione è.
  const demo = (await cookies()).get(SESSION_COOKIE)?.value.startsWith(DEMO_PREFIX) ?? false;
  return (
    <html lang="it" className={`${body.variable} ${code.variable}`}>
      <body className="min-h-dvh">
        <MotionProvider>
        {demo && <DemoBanner />}
        <Nav />
        <main className="mx-auto w-full max-w-4xl px-4 pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pt-6 md:pb-12">{children}</main>
        </MotionProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
