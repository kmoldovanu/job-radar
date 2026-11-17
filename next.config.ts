import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacchetti che devono restare lato server (non vanno impacchettati)
  serverExternalPackages: ["@react-pdf/renderer", "unpdf", "mammoth", "docx"],
};

export default nextConfig;
