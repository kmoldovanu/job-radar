export function isFresh(postedAt: Date | null, maxAgeDays: number, now = new Date()): boolean {
  if (!postedAt) return true; // data mancante: teniamo l'offerta
  return now.getTime() - postedAt.getTime() <= maxAgeDays * 86_400_000;
}
