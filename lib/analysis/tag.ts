import { groupBy, mean } from "./math";
import type { BenchmarkRow, Quality, Shot } from "./types";

/**
 * How good a shot has to be, judged against the scratch benchmark for the
 * club's category rather than against the other shots in the same session.
 *
 * Absolute standards matter here: ranking a session's own shots into terciles
 * would peg the good-shot rate at 33% forever, so "good shot rate up from 48%
 * to 62%" -- the headline metric on the analysis screen -- could never move.
 * These thresholds let it move.
 */
export interface TagThresholds {
  /** Smash factor as a fraction of the scratch benchmark for the category. */
  goodStrike: number;
  badStrike: number;
  /** Sideways miss as a fraction of carry distance. */
  goodDispersion: number;
  badDispersion: number;
}

export const DEFAULT_THRESHOLDS: TagThresholds = {
  goodStrike: 0.90,
  badStrike: 0.82,
  goodDispersion: 0.06,
  badDispersion: 0.14,
};

/** A wedge averaging under this carry is being used for chipping, not full swings. */
export const SHORT_GAME_CARRY_YDS = 60;

/** Fallback scratch smash factors, used when the benchmark table has no row. */
const FALLBACK_SCRATCH_SMASH: Record<string, number> = {
  driver: 1.48, wood: 1.48, hybrid: 1.45, iron: 1.37, wedge: 1.20, putter: 1.0, other: 1.3,
};

function scratchSmash(category: string, benchmarks: BenchmarkRow[]): number {
  const row = benchmarks.find(
    (r) =>
      r.club_category === category &&
      r.metric === "smash_factor" &&
      r.handicap_band === "scratch",
  );
  return row?.min_value ?? FALLBACK_SCRATCH_SMASH[category] ?? 1.3;
}

/**
 * Judges one shot on strike quality and direction.
 *
 * Both have to be good for a shot to count as good; either being poor makes it
 * bad. A shot missing the data to judge it stays "ok" rather than being
 * guessed at.
 */
function judge(
  shot: Shot,
  benchmark: number,
  t: TagThresholds,
  isShortGame: boolean,
): Quality {
  const carry = shot.carryDistance;
  const dispersion =
    carry !== null && carry > 0 && shot.carryDeviationDistance !== null
      ? Math.abs(shot.carryDeviationDistance) / carry
      : null;

  // Chipping: strike quality is not meaningful, so direction decides.
  if (isShortGame) {
    if (dispersion === null) return "ok";
    if (dispersion <= t.goodDispersion) return "good";
    if (dispersion > t.badDispersion) return "bad";
    return "ok";
  }

  const strike = shot.smashFactor === null ? null : shot.smashFactor / benchmark;
  if (strike === null && dispersion === null) return "ok";

  const strikeGood = strike !== null && strike >= t.goodStrike;
  const strikeBad = strike !== null && strike < t.badStrike;
  const lineGood = dispersion !== null && dispersion <= t.goodDispersion;
  const lineBad = dispersion !== null && dispersion > t.badDispersion;

  // Where one measure is missing, the other decides on its own.
  if (strike === null) return lineGood ? "good" : lineBad ? "bad" : "ok";
  if (dispersion === null) return strikeGood ? "good" : strikeBad ? "bad" : "ok";

  if (strikeGood && lineGood) return "good";
  if (strikeBad || lineBad) return "bad";
  return "ok";
}

/**
 * Auto-tags shots good / ok / bad.
 *
 * Strike quality is judged per club category, because a smash factor of 1.30
 * is poor for a driver and good for a wedge. Shots tagged by hand
 * (quality_source = "manual") are left alone.
 */
export function autoTagShots(
  shots: Shot[],
  benchmarks: BenchmarkRow[] = [],
  thresholds: TagThresholds = DEFAULT_THRESHOLDS,
): Shot[] {
  const byClub = groupBy(shots, (s) => s.clubName);
  const out: Shot[] = [];

  for (const [, clubShots] of byClub) {
    const category = clubShots[0].clubCategory;
    const avgCarry = mean(clubShots.map((s) => s.carryDistance));
    const isShortGame =
      (category === "wedge" || category === "other") &&
      avgCarry !== null &&
      avgCarry < SHORT_GAME_CARRY_YDS;

    const benchmark = scratchSmash(category, benchmarks);

    for (const shot of clubShots) {
      out.push({
        ...shot,
        isShortGame,
        quality:
          shot.qualitySource === "manual"
            ? shot.quality
            : judge(shot, benchmark, thresholds, isShortGame),
      });
    }
  }

  return out.sort((a, b) => a.shotIndex - b.shotIndex);
}
