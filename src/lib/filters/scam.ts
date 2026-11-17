import type { Job } from "../types";
import { normalize } from "./geo";

const SCAM_PATTERNS: [RegExp, string][] = [
  [/\btelegram\b/, "Contatto via Telegram"],
  [/\bwhats ?app\b/, "Contatto via WhatsApp"],
  [/commission[- ]only|commission[- ]based only|only commission|100% commission|solo provvigion|nur provision/, "Solo provvigioni"],
  [/\bmlm\b|multi[- ]level marketing|network marketing|pyramid/, "Marketing multilivello"],
  [/(?:pay|paying|deposit|purchase|buy)(?: a| an| the)? (?:registration |training |starter |application |onboarding )?(?:fee|kit|equipment)|(?:registration|training|starter|application) fee|upfront (?:fee|payment|investment)|quota di iscrizione|pagamento anticipato|investimento iniziale/, "Richiesta di pagamento"],
  [/send (?:us )?(?:your )?(?:bank|credit card)|wire transfer|western union|bitcoin payment|gift cards?/, "Richiesta di dati bancari/pagamenti"],
  [/earn \$?\d+[,.]?\d* ?(?:per|a|\/) ?(?:day|week)|get rich|unlimited earning|financial freedom|be your own boss/, "Promesse di guadagno facile"],
];

export function checkScam(job: Pick<Job, "company" | "description" | "title">): { ok: boolean; detail?: string } {
  const company = job.company.trim();
  if (!company || /^(confidential|anonymous|undisclosed|n\/a|private|riservat)/i.test(company)) {
    return { ok: false, detail: "Nessun nome azienda" };
  }
  const text = normalize(`${job.title}\n${job.description}`);
  for (const [re, label] of SCAM_PATTERNS) if (re.test(text)) return { ok: false, detail: label };
  return { ok: true };
}
