import { mean } from "./math";
import type {
  BenchmarkPill, BenchmarkRow, ClubStats, HandicapBand,
} from "./types";

export const BANDS: HandicapBand[] = ["scratch", "hcp10", "hcp20plus"];

/** Nominal handicap each band represents, used for interpolation. */
const BAND_HANDICAP: Record<HandicapBand, number> = {
  scratch: 0,
  hcp10: 10,
  hcp20plus: 24,
};

export function bandForHandicap(handicap: number): HandicapBand {
  if (handicap <= 4) return "scratch";
  if (handicap <= 14) return "hcp10";
  return "hcp20plus";
}

function lookup(
  rows: BenchmarkRow[],
  category: string,
  metric: string,
  band: HandicapBand,
): BenchmarkRow | undefined {
  return rows.find(
    (r) => r.club_category === category && r.metric === metric && r.handicap_band === band,
  );
}

/**
 * Builds the benchmark pill row shown under each club card, with the user's
 * own value slotted in at the position their number actually earns.
 */
export function buildSmashPills(
  clubCategory: string,
  userSmash: number | null,
  rows: BenchmarkRow[],
): BenchmarkPill[] {
  const relevant = rows
    .filter((r) => r.club_category === clubCategory && r.metric === "smash_factor")
    .sort((a, b) => a.sort_order - b.sort_order);

  if (relevant.length === 0) return [];

  const pills: BenchmarkPill[] = relevant.map((r) => ({
    label: r.label,
    isUser: false,
    sortOrder: r.sort_order,
  }));

  if (userSmash !== null) {
    const scratchMin = lookup(rows, clubCategory, "smash_factor", "scratch")?.min_value;
    const hcp10Min = lookup(rows, clubCategory, "smash_factor", "hcp10")?.min_value;

    let order = 3; // default: ahead of the 20+ pill, as in the design
    if (scratchMin !== null && scratchMin !== undefined && userSmash >= scratchMin) order = 0;
    else if (hcp10Min !== null && hcp10Min !== undefined && userSmash >= hcp10Min) order = 1.5;

    pills.push({ label: `You: ${userSmash.toFixed(2)}`, isUser: true, sortOrder: order });
  }

  return pills.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Maps one measured value onto an approximate handicap by interpolating
 * between the seeded band thresholds.
 *
 * "higher" metrics (smash factor) improve upward; "lower" metrics (absolute
 * path, face, deviation) improve toward zero.
 */
function handicapFromMetric(
  value: number,
  category: string,
  metric: string,
  rows: BenchmarkRow[],
  direction: "higher" | "lower",
): number | null {
  const scratch = lookup(rows, category, metric, "scratch");
  const hcp10 = lookup(rows, category, metric, "hcp10");
  const hcp20 = lookup(rows, category, metric, "hcp20plus");
  if (!scratch || !hcp10 || !hcp20) return null;

  if (direction === "higher") {
    const s = scratch.min_value, t = hcp10.min_value, u = hcp20.min_value;
    if (s === null || t === null || u === null) return null;
    if (value >= s) return 0;
    if (value >= t) return lerp(value, t, s, BAND_HANDICAP.hcp10, BAND_HANDICAP.scratch);
    if (value >= u) return lerp(value, u, t, 36, BAND_HANDICAP.hcp10);
    return 36;
  }

  // "lower is better": the band's max_value is the threshold to stay under.
  const s = scratch.max_value, t = hcp10.max_value, u = hcp20.max_value;
  if (s === null || t === null || u === null) return null;
  if (value <= s) return 0;
  if (value <= t) return lerp(value, s, t, BAND_HANDICAP.scratch, BAND_HANDICAP.hcp10);
  if (value <= u) return lerp(value, t, u, BAND_HANDICAP.hcp10, 36);
  return 36;
}

function lerp(v: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0;
  const t = (v - x0) / (x1 - x0);
  return y0 + t * (y1 - y0);
}

/**
 * Estimates a handicap range from ball data alone -- the "Estimated handicap
 * 20-26 - Based on ball data" tile.
 *
 * Each full-swing club contributes a handicap estimate per metric (smash
 * factor, absolute club path, absolute deviation); those are averaged and
 * widened into a range, because ball striking alone cannot pin down a
 * handicap that also depends on putting and course management.
 */
export function estimateHandicap(
  clubs: ClubStats[],
  rows: BenchmarkRow[],
): { low: number; high: number; band: HandicapBand } | null {
  const estimates: number[] = [];

  for (const c of clubs) {
    if (c.isShortGame || c.clubCategory === "putter" || c.clubCategory === "other") continue;

    const cat = c.clubCategory;
    if (c.avgSmash !== null) {
      const h = handicapFromMetric(c.avgSmash, cat, "smash_factor", rows, "higher");
      if (h !== null) estimates.push(h);
    }
    if (c.avgPath !== null) {
      const h = handicapFromMetric(Math.abs(c.avgPath), cat, "club_path_abs", rows, "lower");
      if (h !== null) estimates.push(h);
    }
    if (c.avgAbsDeviation !== null) {
      const h = handicapFromMetric(c.avgAbsDeviation, cat, "deviation_abs", rows, "lower");
      if (h !== null) estimates.push(h);
    }
  }

  const m = mean(estimates);
  if (m === null || estimates.length < 3) return null;

  const low = Math.max(0, Math.round(m - 3));
  const high = Math.min(54, Math.round(m + 3));
  return { low, high, band: bandForHandicap(m) };
}

/** Whether a value sits inside the band's acceptable range. */
export function meetsBand(
  value: number,
  category: string,
  metric: string,
  band: HandicapBand,
  rows: BenchmarkRow[],
): boolean | null {
  const row = lookup(rows, category, metric, band);
  if (!row) return null;
  if (row.min_value !== null && value < row.min_value) return false;
  if (row.max_value !== null && value > row.max_value) return false;
  return true;
}
