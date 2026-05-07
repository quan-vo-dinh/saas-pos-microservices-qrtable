export const PRIORITY_BUCKET_FACTOR = 10_000_000_000_000;

export function queueScore(priority: boolean, confirmedAtEpochMs: number): number {
  const priorityRank = priority ? 0 : 1;
  return priorityRank * PRIORITY_BUCKET_FACTOR + confirmedAtEpochMs;
}
