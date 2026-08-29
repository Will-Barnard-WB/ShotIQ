import { buildSmashPills, estimateHandicap, bandForHandicap } from "./benchmarks";
import { buildCues, buildFaults, buildImprovements, type InsightContext } from "./insights";
import { compareSessions } from "./compare";
import { computeClubStats, goodShotRate, isHittingWell } from "./stats";
import { autoTagShots } from "./tag";
import type {
  BenchmarkRow, ClubStats, ClubStatsWithBenchmarks, SessionAnalysis, Shot,
} from "./types";

export * from "./types";
export { parseR10Csv, splitByDate } from "./parseR10";
export { autoTagShots, DEFAULT_THRESHOLDS, SHORT_GAME_CARRY_YDS } from "./tag";
export { computeClubStats, isHittingWell, goodShotRate } from "./stats";
export { findDominantVariable, effectSizeLabel } from "./dominant";
export { compareSessions, compareClubStats, formatDelta, METRIC_SPECS } from "./compare";
export { estimateHandicap, bandForHandicap, buildSmashPills } from "./benchmarks";
export { clubCategory, compareClubs } from "./clubs";

// Palette taken from the .analysis-wrap block of the original design.
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

const clamp = (n: number) => Math.max(4, Math.min(100, n));

/**
 * Builds the two benchmark bars on a club card: strike quality (smash factor,
 * higher is better) and path control (absolute path, lower is better). The
 * fill percentage is progress toward the scratch benchmark, so a full bar
 * means tour-standard rather than "100% of something".
 */
function buildBars(club: ClubStats, rows: BenchmarkRow[]) {
  const bars: ClubStatsWithBenchmarks["bars"] = [];
  const at = (metric: string, band: string) =>
    rows.find(
      (r) => r.club_category === club.clubCategory &&
             r.metric === metric &&
             r.handicap_band === band,
    );

  if (club.avgSmash !== null) {
    const scratch = at("smash_factor", "scratch")?.min_value;
    const hcp10 = at("smash_factor", "hcp10")?.min_value;
    const floor = at("smash_factor", "hcp20plus")?.min_value;
    if (scratch != null && hcp10 != null && floor != null) {
      const pct = clamp(((club.avgSmash - floor) / (scratch - floor)) * 100);
      const color = club.avgSmash >= hcp10 ? GREEN : club.avgSmash >= floor ? AMBER : RED;
      const note = club.avgSmash >= hcp10 ? "Better" : club.avgSmash >= floor ? "Avg" : "Below";
      bars.push({ label: `Smash ${club.avgSmash.toFixed(2)}`, pct, color, note });
    }
  }

  if (club.avgPath !== null) {
    const scratch = at("club_path_abs", "scratch")?.max_value;
    const hcp10 = at("club_path_abs", "hcp10")?.max_value;
    const ceiling = at("club_path_abs", "hcp20plus")?.max_value;
    if (scratch != null && hcp10 != null && ceiling != null) {
      const abs = Math.abs(club.avgPath);
      const pct = clamp(((ceiling - abs) / (ceiling - scratch)) * 100);
      const color = abs <= hcp10 ? GREEN : abs <= ceiling ? AMBER : RED;
      const note = abs <= hcp10 ? "Better" : abs <= ceiling ? "Avg" : "Below";
      bars.push({
        label: `Path ${club.avgPath > 0 ? "+" : ""}${club.avgPath.toFixed(1)}°`,
        pct, color, note,
      });
    }
  }

  return bars;
}

function buildBadge(
  club: ClubStats,
  mostImprovedClub: string | null,
): ClubStatsWithBenchmarks["badge"] {
  if (club.isShortGame) return { text: "short game", tone: "info" };
  if (club.clubName === mostImprovedClub) return { text: "most improved", tone: "good" };
  if ((club.goodBadCarryGap ?? 0) >= 30) return { text: "needs work", tone: "warn" };
  if (club.dominant && Math.abs(club.dominant.effect) >= 0.8) {
    return { text: "consistent fault", tone: "warn" };
  }
  if (isHittingWell(club)) return { text: "hitting well", tone: "good" };
  return null;
}

export interface PreviousSession {
  id: string;
  name: string;
  sessionDate: string;
  clubStats: ClubStats[];
}

export interface BuildAnalysisParams {
  shots: Shot[];
  sessionDate: string;
  benchmarks: BenchmarkRow[];
  /** From profiles.handicap. Null means estimate it from ball data. */
  userHandicap: number | null;
  previous: PreviousSession | null;
}

/**
 * Turns a session's shots into the payload the analysis page renders.
 * Pure: no I/O, so it can be unit tested against fixture CSVs and recomputed
 * at any time from the stored shots.
 */
export function buildAnalysis(params: BuildAnalysisParams): SessionAnalysis {
  const { shots, sessionDate, benchmarks, userHandicap, previous } = params;

  const clubs = computeClubStats(shots);
  const comparisons = previous ? compareSessions(clubs, previous.clubStats) : [];

  // The club with the most favourable total movement gets the badge.
  let mostImproved: string | null = null;
  let bestScore = 0;
  for (const c of comparisons) {
    const score = c.deltas
      .filter((d) => d.sense === "better")
      .reduce((a, d) => a + d.magnitude, 0)
      - c.deltas.filter((d) => d.sense === "worse").reduce((a, d) => a + d.magnitude, 0);
    if (score > bestScore) {
      bestScore = score;
      mostImproved = c.clubName;
    }
  }

  const estimate = estimateHandicap(clubs, benchmarks);
  const band = userHandicap !== null ? bandForHandicap(userHandicap) : estimate?.band ?? "hcp20plus";

  const ctx: InsightContext = { clubs, comparisons, benchmarks, band };

  const clubsWithBenchmarks: ClubStatsWithBenchmarks[] = clubs.map((c) => ({
    ...c,
    smashPills: c.isShortGame ? [] : buildSmashPills(c.clubCategory, c.avgSmash, benchmarks),
    badge: buildBadge(c, mostImproved),
    bars: c.isShortGame ? [] : buildBars(c, benchmarks),
  }));

  const prevShotCount = previous?.clubStats.reduce((a, c) => a + c.n, 0) ?? 0;
  const prevGood = previous?.clubStats.reduce((a, c) => a + c.goodN, 0) ?? 0;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sessionDate,
    shotCount: shots.length,
    clubCount: clubs.length,
    goodShotRate: goodShotRate(shots),
    clubsHittingWell: clubs.filter(isHittingWell).length,
    handicapEstimate:
      userHandicap !== null
        ? { low: userHandicap, high: userHandicap, band }
        : estimate,
    handicapIsUserSet: userHandicap !== null,
    previous: previous
      ? {
          sessionId: previous.id,
          name: previous.name,
          sessionDate: previous.sessionDate,
          shotCount: prevShotCount,
          goodShotRate: prevShotCount > 0 ? prevGood / prevShotCount : 0,
          clubsHittingWell: previous.clubStats.filter(isHittingWell).length,
        }
      : null,
    clubs: clubsWithBenchmarks,
    comparisons,
    improvements: buildImprovements(ctx),
    faults: buildFaults(ctx),
    cues: buildCues(ctx),
  };
}

/** Convenience: tag then analyse, for the upload path. */
export function analyseShots(params: BuildAnalysisParams) {
  const tagged = autoTagShots(params.shots, params.benchmarks);
  return { shots: tagged, analysis: buildAnalysis({ ...params, shots: tagged }) };
}
