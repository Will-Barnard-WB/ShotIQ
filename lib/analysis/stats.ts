import { bestWorstCohorts } from "./cohorts";
import { findDominantVariable } from "./dominant";
import { compareClubs } from "./clubs";
import { groupBy, max, mean, min, stdev } from "./math";
import type { ClubStats, Shot } from "./types";

/** Aggregates a session's shots into one ClubStats row per club. */
export function computeClubStats(shots: Shot[]): ClubStats[] {
  const byClub = groupBy(shots, (s) => s.clubName);
  const out: ClubStats[] = [];

  for (const [clubName, clubShots] of byClub) {
    // goodN/badN report the absolute tags, which is what the good-shot rate
    // is built from. The carry gap is a best-vs-worst question, so it uses the
    // relative cohorts instead -- otherwise it would vanish on any club where
    // too few shots cleared the absolute bar.
    const good = clubShots.filter((s) => s.quality === "good");
    const bad = clubShots.filter((s) => s.quality === "bad");
    const { best, worst } = bestWorstCohorts(clubShots);

    const goodCarry = mean(best.map((s) => s.carryDistance));
    const badCarry = mean(worst.map((s) => s.carryDistance));

    out.push({
      clubName,
      clubCategory: clubShots[0].clubCategory,
      isShortGame: clubShots[0].isShortGame,
      n: clubShots.length,

      avgCarry: mean(clubShots.map((s) => s.carryDistance)),
      avgTotal: mean(clubShots.map((s) => s.totalDistance)),
      avgClubSpeed: mean(clubShots.map((s) => s.clubSpeed)),
      avgBallSpeed: mean(clubShots.map((s) => s.ballSpeed)),
      avgSmash: mean(clubShots.map((s) => s.smashFactor)),
      avgPath: mean(clubShots.map((s) => s.clubPath)),
      avgFace: mean(clubShots.map((s) => s.clubFace)),
      avgFaceToPath: mean(clubShots.map((s) => s.faceToPath)),
      avgAttackAngle: mean(clubShots.map((s) => s.attackAngle)),
      avgDeviation: mean(clubShots.map((s) => s.carryDeviationDistance)),
      avgAbsDeviation: mean(
        clubShots.map((s) =>
          s.carryDeviationDistance === null ? null : Math.abs(s.carryDeviationDistance),
        ),
      ),
      carryStdev: stdev(clubShots.map((s) => s.carryDistance)),
      carryMin: min(clubShots.map((s) => s.carryDistance)),
      carryMax: max(clubShots.map((s) => s.carryDistance)),

      goodN: good.length,
      badN: bad.length,
      goodBadCarryGap:
        goodCarry !== null && badCarry !== null ? goodCarry - badCarry : null,

      dominant: findDominantVariable(clubShots),
    });
  }

  return out.sort(compareClubs);
}

/**
 * A club counts as "hitting well" when its good shots outnumber its bad ones
 * and dispersion is under control. Drives the "clubs hitting well" tile.
 */
export function isHittingWell(c: ClubStats): boolean {
  if (c.goodN === 0 && c.badN === 0) return false;
  if (c.goodN <= c.badN) return false;
  if (c.avgAbsDeviation !== null && c.avgCarry !== null && c.avgCarry > 0) {
    // Sideways miss under 15% of carry.
    return c.avgAbsDeviation / c.avgCarry < 0.15;
  }
  return true;
}

export function goodShotRate(shots: Shot[]): number {
  const rated = shots.filter((s) => s.quality === "good" || s.quality === "bad" || s.quality === "ok");
  if (rated.length === 0) return 0;
  return shots.filter((s) => s.quality === "good").length / rated.length;
}
