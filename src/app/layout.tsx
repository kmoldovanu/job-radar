import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobRadar",
  description: "Trova offerte di lavoro in tutto il mondo, prepara CV su misura e traccia le candidature.",
  applicationName: "JobRadar",
  appleWebApp: { capable: true, title: "JobRadar", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1f57c9" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-dvh">
        <Nav />
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 md:pb-10">{children}</main>
        <RegisterSW />
      </body>
    </html>
  );
}
