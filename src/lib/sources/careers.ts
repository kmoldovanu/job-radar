export type Ats = "greenhouse" | "lever" | "ashby";
export interface CareersRef {
  ats: Ats;
  token: string;
}

/** Riconosce le board Greenhouse / Lever / Ashby da un URL (o da HTML che le contiene). */
export function parseCareersUrl(input: string): CareersRef | null {
  const s = input.trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=|v1\/boards\/)([a-z0-9_-]+)/i)))
    return { ats: "greenhouse", token: m[1].toLowerCase() };
  if ((m = s.match(/(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/([a-z0-9_-]+)/i)) && m[1].toLowerCase() !== "embed")
    return { ats: "greenhouse", token: m[1].toLowerCase() };
  if ((m = s.match(/jobs\.eu\.lever\.co\/([a-z0-9_.-]+)/i))) return { ats: "lever", token: `eu:${m[1].toLowerCase()}` };
  if ((m = s.match(/(?:jobs|api)\.lever\.co\/(?:v0\/postings\/)?([a-z0-9_.-]+)/i)))
    return { ats: "lever", token: m[1].toLowerCase() };
  if ((m = s.match(/(?:jobs\.ashbyhq\.com|job-board\/)\/?([a-z0-9_.%-]+)/i)))
    return { ats: "ashby", token: decodeURIComponent(m[1]) };
  return null;
}

/** Nome leggibile a partire dal token ("acme-corp" → "Acme Corp"). */
export function prettyName(token: string): string {
  return token
    .replace(/^eu:/, "")
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
