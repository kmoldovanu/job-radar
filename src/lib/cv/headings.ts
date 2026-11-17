import type { CvLang } from "../types";

export interface Headings {
  summary: string;
  experience: string;
  education: string;
  skills: string;
  certifications: string;
  languages: string;
  projects: string;
  present: string;
  letter: string;
}

export const HEADINGS: Record<CvLang, Headings> = {
  en: { summary: "Profile", experience: "Professional Experience", education: "Education", skills: "Skills", certifications: "Certifications", languages: "Languages", projects: "Projects", present: "Present", letter: "Cover Letter" },
  it: { summary: "Profilo", experience: "Esperienza professionale", education: "Formazione", skills: "Competenze", certifications: "Certificazioni", languages: "Lingue", projects: "Progetti", present: "Oggi", letter: "Lettera di presentazione" },
  de: { summary: "Profil", experience: "Berufserfahrung", education: "Ausbildung", skills: "Kenntnisse", certifications: "Zertifizierungen", languages: "Sprachen", projects: "Projekte", present: "heute", letter: "Anschreiben" },
  fr: { summary: "Profil", experience: "Expérience professionnelle", education: "Formation", skills: "Compétences", certifications: "Certifications", languages: "Langues", projects: "Projets", present: "Aujourd'hui", letter: "Lettre de motivation" },
  es: { summary: "Perfil", experience: "Experiencia profesional", education: "Formación", skills: "Competencias", certifications: "Certificaciones", languages: "Idiomas", projects: "Proyectos", present: "Actualidad", letter: "Carta de presentación" },
  nl: { summary: "Profiel", experience: "Werkervaring", education: "Opleiding", skills: "Vaardigheden", certifications: "Certificeringen", languages: "Talen", projects: "Projecten", present: "Heden", letter: "Motivatiebrief" },
  pt: { summary: "Perfil", experience: "Experiência profissional", education: "Formação", skills: "Competências", certifications: "Certificações", languages: "Idiomas", projects: "Projetos", present: "Atual", letter: "Carta de apresentação" },
};

export function headingsFor(lang: string): Headings {
  return HEADINGS[(lang as CvLang)] ?? HEADINGS.en;
}

export function dateRange(start: string, end: string, present: string): string {
  if (!start && !end) return "";
  return `${start}${start ? " – " : ""}${end || present}`;
}
