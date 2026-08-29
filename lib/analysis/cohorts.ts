import { groupBy, mean, nums, stdev } from "./math";
import type { Shot } from "./types";

/** Below this a club cannot be split into best and worst at all. */
export const MIN_FOR_SPLIT = 6;
/** Each cohort needs this many shots before a comparison means anything. */
export const MIN_COHORT = 3;

function z(value: number | null, m: number | null, sd: number | null): number {
  if (value === null || m === null || sd === null || sd === 0) return 0;
  return (value - m) / sd;
}

/**
 * Splits one club's shots into its best and worst.
 *
 * This answers a different question from the good/ok/bad tags. Those are an
 * absolute judgement -- "was that a good shot?" -- so the good-shot rate can
 * improve between sessions. This is a relative one: "what separates your best
 * shots from your worst?", which is what the dominant-variable search needs,
 * and it needs cohorts on every club rather than only on the ones where enough
 * shots cleared an absolute bar.
 *
 * Explicit tags win when there are enough of them, so hand-tagging a session
 * feeds straight into the analysis. Otherwise the shots are ranked on strike
 * and dispersion and split into terciles.
 */
export function bestWorstCohorts(shots: Shot[]): { best: Shot[]; worst: Shot[] } {
  const labelledBest = shots.filter((s) => s.quality === "good");
  const labelledWorst = shots.filter((s) => s.quality === "bad");
  if (labelledBest.length >= MIN_COHORT && labelledWorst.length >= MIN_COHORT) {
    return { best: labelledBest, worst: labelledWorst };
  }

  if (shots.length < MIN_FOR_SPLIT) return { best: [], worst: [] };

  const hasSmash = shots.some((s) => s.smashFactor !== null);
  const strikeOf = (s: Shot) => (hasSmash ? s.smashFactor : s.carryDistance);
  const absDev = (s: Shot) =>
    s.carryDeviationDistance === null ? null : Math.abs(s.carryDeviationDistance);

  const strikeMean = mean(shots.map(strikeOf));
  const strikeSd = stdev(shots.map(strikeOf));
  const devMean = mean(shots.map(absDev));
  const devSd = stdev(shots.map(absDev));

  const ranked = shots
    .map((shot) => ({
      shot,
      score: z(strikeOf(shot), strikeMean, strikeSd) - z(absDev(shot), devMean, devSd),
    }))
    .sort((a, b) => b.score - a.score);

  const cut = Math.max(MIN_COHORT, Math.floor(ranked.length / 3));
  return {
    best: ranked.slice(0, cut).map((r) => r.shot),
    worst: ranked.slice(ranked.length - cut).map((r) => r.shot),
  };
}

/** Convenience for callers holding a whole session. */
export function cohortsByClub(shots: Shot[]) {
  const out = new Map<string, { best: Shot[]; worst: Shot[] }>();
  for (const [club, clubShots] of groupBy(shots, (s) => s.clubName)) {
    out.set(club, bestWorstCohorts(clubShots));
  }
  return out;
}

export { nums };
