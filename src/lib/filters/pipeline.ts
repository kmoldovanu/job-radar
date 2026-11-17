import type { Job, MatchDetails, Profile, RejectReason, Settings } from "../types";
import { isFresh } from "./freshness";
import { checkGeo } from "./geo";
import { checkLanguage } from "./language";
import { excludedInTitle, quickMatch } from "./match";
import { checkScam } from "./scam";

export interface KeptJob extends Job {
  match: MatchDetails;
  adLanguage: string | null;
}

export interface Rejection {
  reason: RejectReason;
  title: string;
  company: string;
  detail: string;
}

export interface FilterOutcome {
  kept: KeptJob[];
  rejected: Partial<Record<RejectReason, number>>;
  samples: Rejection[];
}

/** Applica tutti i filtri in ordine: freschezza → truffa → parole escluse → geografia → lingua → match. */
export function runFilters(jobs: Job[], profile: Profile, settings: Settings, now = new Date()): FilterOutcome {
  const kept: KeptJob[] = [];
  const rejected: FilterOutcome["rejected"] = {};
  const samples: Rejection[] = [];
  const seen = new Set<string>();

  const reject = (job: Job, reason: RejectReason, detail: string) => {
    rejected[reason] = (rejected[reason] ?? 0) + 1;
    if (samples.length < 60) samples.push({ reason, title: job.title, company: job.company, detail });
  };

  for (const job of jobs) {
    if (seen.has(job.id)) {
      reject(job, "duplicato", "Doppione nella stessa fonte");
      continue;
    }
    seen.add(job.id);

    if (!isFresh(job.postedAt, settings.maxAgeDays, now)) {
      reject(job, "vecchio", `Pubblicata più di ${settings.maxAgeDays} giorni fa`);
      continue;
    }
    const scam = checkScam(job);
    if (!scam.ok) {
      reject(job, "truffa", scam.detail ?? "");
      continue;
    }
    const ex = excludedInTitle(job.title, profile.preferences.excludeKeywords);
    if (ex) {
      reject(job, "parola_esclusa", `Titolo contiene "${ex}"`);
      continue;
    }
    const geo = checkGeo(job, profile.preferences);
    if (!geo.ok) {
      reject(job, geo.reason ?? "geografia", geo.detail ?? "");
      continue;
    }
    const lang = checkLanguage(`${job.title}\n${job.description}`, profile);
    if (!lang.ok) {
      reject(job, "lingua", lang.detail ?? "");
      continue;
    }
    const match = quickMatch(job, profile);
    if (match.score < settings.minQuickScore) {
      reject(job, "match_basso", `Punteggio ${match.score}`);
      continue;
    }
    kept.push({ ...job, match, adLanguage: lang.adLanguage });
  }
  return { kept, rejected, samples };
}
