import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobRadar",
    short_name: "JobRadar",
    description: "Offerte di lavoro, CV su misura e tracker delle candidature",
    start_url: "/",
    display: "standalone",
    background_color: "#0a1120",
    theme_color: "#0a1120",
    lang: "it",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
