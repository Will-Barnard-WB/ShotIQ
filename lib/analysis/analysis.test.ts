import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { parseR10Csv, splitByDate } from "./parseR10";
import { autoTagShots } from "./tag";
import { computeClubStats } from "./stats";
import { compareSessions } from "./compare";
import { buildAnalysis } from "./index";
import type { BenchmarkRow, ClubStats } from "./types";

const root = path.resolve(__dirname, "../..");
const csv = (name: string) => readFileSync(path.join(root, "fixtures", name), "utf8");

/**
 * Read the seeded benchmark rows straight out of the migration seed, so the
 * tests exercise the same numbers the database holds rather than a copy that
 * can drift.
 */
function seededBenchmarks(): BenchmarkRow[] {
  const sql = readFileSync(path.join(root, "supabase/seed/benchmarks.sql"), "utf8");
  const rows: BenchmarkRow[] = [];
  const re = /\(\s*'([^']+)','([^']+)',\s*'([^']+)',\s*([\d.]+|null),\s*([\d.]+|null),\s*'([^']*)',\s*(\d+)\s*\)/g;
  for (const m of sql.matchAll(re)) {
    rows.push({
      club_category: m[1],
      handicap_band: m[2],
      metric: m[3],
      min_value: m[4] === "null" ? null : Number(m[4]),
      max_value: m[5] === "null" ? null : Number(m[5]),
      label: m[6],
      sort_order: Number(m[7]),
    });
  }
  return rows;
}

const BENCHMARKS = seededBenchmarks();

function statsFor(file: string): ClubStats[] {
  const parsed = parseR10Csv(csv(file));
  return computeClubStats(autoTagShots(parsed.shots, BENCHMARKS));
}

const byName = (stats: ClubStats[], name: string) => {
  const c = stats.find((s) => s.clubName === name);
  if (!c) throw new Error(`club ${name} not in fixture`);
  return c;
};

/* ------------------------------------------------------------------ */

describe("seed data", () => {
  it("loads the benchmark rows from the seed file", () => {
    expect(BENCHMARKS.length).toBe(60);
    expect(BENCHMARKS.filter((r) => r.metric === "smash_factor")).toHaveLength(15);
  });
});

describe("parseR10Csv", () => {
  it("parses a session export", () => {
    const r = parseR10Csv(csv("session-2.csv"));
    expect(r.missingHeaders).toEqual([]);
    expect(r.shots).toHaveLength(47);
    expect(r.sessionDate).toBe("2026-03-31");
    expect(r.dates).toEqual(["2026-03-31"]);
    expect(r.units).toEqual({ distance: "yards", speed: "mph" });
  });

  it("recognises every column in the export", () => {
    const r = parseR10Csv(csv("session-1.csv"));
    expect(r.unmappedHeaders).toEqual([]);
    expect(r.shots).toHaveLength(38);
  });

  it("fails loudly and names the column when a required header is renamed", () => {
    const r = parseR10Csv(csv("session-2-renamed-header.csv"));
    expect(r.missingHeaders).toContain("Carry Distance");
    expect(r.shots).toHaveLength(0);
    // The unrecognised header is surfaced so the user can see what happened.
    expect(r.unmappedHeaders).toContain("Carry Dist Yards");
  });

  it("derives smash factor and face-to-path when the columns are absent", () => {
    const source = csv("session-2.csv").split("\n");
    const headers = source[0].split(",");
    const drop = [headers.indexOf("Smash Factor"), headers.indexOf("Face to Path")];
    const trimmed = source
      .filter((l) => l.trim())
      .map((line) => line.split(",").filter((_, i) => !drop.includes(i)).join(","))
      .join("\n");

    const r = parseR10Csv(trimmed);
    const shot = r.shots[0];
    expect(shot.smashFactor).toBeCloseTo(shot.ballSpeed! / shot.clubSpeed!, 6);
    expect(shot.faceToPath).toBeCloseTo(shot.clubFace! - shot.clubPath!, 6);
  });

  it("converts metric files to yards and mph", () => {
    const lines = csv("session-2.csv").split("\n");
    lines[0] = lines[0]
      .replace("Carry Distance", "Carry Distance [m]")
      .replace("Club Speed", "Club Speed [kph]");
    const r = parseR10Csv(lines.join("\n"));
    const plain = parseR10Csv(csv("session-2.csv"));
    expect(r.units).toEqual({ distance: "metres", speed: "kph" });
    expect(r.shots[0].carryDistance!).toBeCloseTo(plain.shots[0].carryDistance! * 1.09361, 3);
    expect(r.shots[0].clubSpeed!).toBeCloseTo(plain.shots[0].clubSpeed! * 0.621371, 3);
  });

  it("splits a multi-date file into one bucket per date", () => {
    const s1 = parseR10Csv(csv("session-1.csv"));
    const s2 = parseR10Csv(csv("session-2.csv"));
    const buckets = splitByDate([...s1.shots, ...s2.shots]);
    expect(buckets.map((b) => b.date)).toEqual(["2026-03-17", "2026-03-31"]);
    expect(buckets.map((b) => b.shots.length)).toEqual([38, 47]);
  });
});

describe("club stats reproduce the session numbers in the design", () => {
  const s1 = statsFor("session-1.csv");
  const s2 = statsFor("session-2.csv");

  it("8 Iron: club face improves from -11.4 to -2.8", () => {
    expect(byName(s1, "8 Iron").avgFace!).toBeCloseTo(-11.4, 1);
    expect(byName(s2, "8 Iron").avgFace!).toBeCloseTo(-2.8, 1);
  });

  it("8 Iron: deviation improves from -20.3 to -2.7 yards", () => {
    expect(byName(s1, "8 Iron").avgDeviation!).toBeCloseTo(-20.3, 1);
    expect(byName(s2, "8 Iron").avgDeviation!).toBeCloseTo(-2.7, 1);
  });

  it("8 Iron: smash factor improves from 1.13 to 1.21", () => {
    expect(byName(s1, "8 Iron").avgSmash!).toBeCloseTo(1.13, 2);
    expect(byName(s2, "8 Iron").avgSmash!).toBeCloseTo(1.21, 2);
  });

  it("7 Iron: club path improves from -12.1 to -10.1", () => {
    expect(byName(s1, "7 Iron").avgPath!).toBeCloseTo(-12.1, 1);
    expect(byName(s2, "7 Iron").avgPath!).toBeCloseTo(-10.1, 1);
  });

  it("5 Wood: smash factor slips from 1.35 to 1.32", () => {
    expect(byName(s1, "5 Wood").avgSmash!).toBeCloseTo(1.35, 2);
    expect(byName(s2, "5 Wood").avgSmash!).toBeCloseTo(1.32, 2);
  });
});

describe("dominant variable", () => {
  const s2 = statsFor("session-2.csv");

  it("resolves the 7 Iron to club face", () => {
    const seven = byName(s2, "7 Iron");
    expect(seven.dominant).not.toBeNull();
    expect(seven.dominant!.metric).toBe("clubFace");
    // Good shots have a squarer face than bad ones.
    expect(seven.dominant!.goodMean).toBeGreaterThan(seven.dominant!.badMean);
    // Face-to-path is collinear with face, so it must not take the headline
    // on the strength of path noise alone.
    expect(Math.abs(seven.dominant!.effect)).toBeGreaterThan(1);
  });

  it("never picks smash factor, which is what defines the good/bad split", () => {
    for (const club of s2) {
      expect(club.dominant?.metric).not.toBe("smashFactor");
    }
  });

  it("returns null when a cohort is too small", () => {
    const s1 = statsFor("session-1.csv");
    expect(byName(s1, "Sand Wedge").dominant).toBeNull();
  });

  it("still finds a dominant variable when few shots cleared the absolute bar", () => {
    // The 7 iron has only 1 good and 2 bad shots by absolute standard, but
    // "what separates your best from your worst" must still have an answer.
    const s2 = statsFor("session-2.csv");
    const seven = byName(s2, "7 Iron");
    expect(seven.goodN + seven.badN).toBeLessThan(seven.n);
    expect(seven.dominant).not.toBeNull();
  });
});

describe("tagging", () => {
  it("judges shots against an absolute standard, not against each other", () => {
    // A relative split would peg every session at the same good-shot rate.
    // These two sessions must differ, because session 2 was struck better.
    const s1 = autoTagShots(parseR10Csv(csv("session-1.csv")).shots, BENCHMARKS);
    const s2 = autoTagShots(parseR10Csv(csv("session-2.csv")).shots, BENCHMARKS);
    const rate = (shots: typeof s1) =>
      shots.filter((x) => x.quality === "good").length / shots.length;

    expect(rate(s2)).toBeGreaterThan(rate(s1));
    expect(rate(s1)).not.toBeCloseTo(1 / 3, 2);
    expect(rate(s2)).not.toBeCloseTo(1 / 3, 2);
  });

  it("holds a club to its own category's standard", () => {
    // 1.04 is a fair strike for a wedge and a poor one for a wood, so the
    // same smash factor must not be judged the same way.
    const s2 = statsFor("session-2.csv");
    const wedge = byName(s2, "Sand Wedge");
    const wood = byName(s2, "5 Wood");
    expect(wedge.avgSmash!).toBeLessThan(wood.avgSmash!);
    expect(wedge.goodN).toBeGreaterThan(0);
  });

  it("cannot split a 4-shot club into best and worst", () => {
    const s1 = statsFor("session-1.csv");
    const wedge = byName(s1, "Sand Wedge");
    expect(wedge.n).toBe(4);
    expect(wedge.dominant).toBeNull();
    expect(wedge.goodBadCarryGap).toBeNull();
  });

  it("flags the sand wedge as short game and leaves full-swing clubs alone", () => {
    const s2 = statsFor("session-2.csv");
    expect(byName(s2, "Sand Wedge").isShortGame).toBe(true);
    expect(byName(s2, "7 Iron").isShortGame).toBe(false);
  });

  it("leaves manually tagged shots untouched", () => {
    const parsed = parseR10Csv(csv("session-2.csv"));
    const manual = parsed.shots.map((s, i) =>
      i === 0 ? { ...s, quality: "bad" as const, qualitySource: "manual" as const } : s,
    );
    const tagged = autoTagShots(manual, BENCHMARKS);
    expect(tagged[0].quality).toBe("bad");
    expect(tagged[0].qualitySource).toBe("manual");
  });
});

describe("session comparison", () => {
  const s1 = statsFor("session-1.csv");
  const s2 = statsFor("session-2.csv");
  const comparisons = compareSessions(s2, s1);

  it("compares every club the two sessions share", () => {
    expect(comparisons.map((c) => c.clubName).sort()).toEqual(
      ["5 Wood", "7 Iron", "8 Iron", "Sand Wedge"].sort(),
    );
  });

  it("skips a club with no history in the earlier session", () => {
    // The 9 iron only appears in session 2.
    expect(s2.map((c) => c.clubName)).toContain("9 Iron");
    expect(s1.map((c) => c.clubName)).not.toContain("9 Iron");
    expect(comparisons.map((c) => c.clubName)).not.toContain("9 Iron");
  });

  it("reads the 8 Iron face and deviation moves as improvements", () => {
    const eight = comparisons.find((c) => c.clubName === "8 Iron")!;
    expect(eight.deltas.find((d) => d.metric === "face")!.sense).toBe("better");
    expect(eight.deltas.find((d) => d.metric === "deviation")!.sense).toBe("better");
    expect(eight.deltas.find((d) => d.metric === "smash")!.sense).toBe("better");
  });

  it("reads the 5 Wood smash drop as a regression", () => {
    const wood = comparisons.find((c) => c.clubName === "5 Wood")!;
    expect(wood.deltas.find((d) => d.metric === "smash")!.sense).toBe("worse");
  });

  it("ranks the most-changed club first", () => {
    expect(comparisons[0].deltas[0].magnitude).toBeGreaterThanOrEqual(
      comparisons[comparisons.length - 1].deltas[0].magnitude,
    );
  });
});

describe("buildAnalysis", () => {
  const s1shots = autoTagShots(parseR10Csv(csv("session-1.csv")).shots, BENCHMARKS);
  const s2shots = autoTagShots(parseR10Csv(csv("session-2.csv")).shots, BENCHMARKS);
  const s1stats = computeClubStats(s1shots);

  const analysis = buildAnalysis({
    shots: s2shots,
    sessionDate: "2026-03-31",
    benchmarks: BENCHMARKS,
    userHandicap: null,
    previous: {
      id: "prev", name: "Session 1", sessionDate: "2026-03-17", clubStats: s1stats,
    },
  });

  it("summarises the session", () => {
    expect(analysis.shotCount).toBe(47);
    expect(analysis.clubCount).toBe(5);
    expect(analysis.previous!.shotCount).toBe(38);
    expect(analysis.goodShotRate).toBeGreaterThan(0);
  });

  it("estimates a handicap from ball data when the profile has none", () => {
    expect(analysis.handicapIsUserSet).toBe(false);
    expect(analysis.handicapEstimate).not.toBeNull();
    expect(analysis.handicapEstimate!.low).toBeLessThan(analysis.handicapEstimate!.high);
  });

  it("uses the profile handicap when one is set", () => {
    const withHcp = buildAnalysis({
      shots: s2shots, sessionDate: "2026-03-31", benchmarks: BENCHMARKS,
      userHandicap: 12, previous: null,
    });
    expect(withHcp.handicapIsUserSet).toBe(true);
    expect(withHcp.handicapEstimate).toEqual({ low: 12, high: 12, band: "hcp10" });
  });

  it("produces improvements, faults and exactly three cues", () => {
    expect(analysis.improvements.length).toBeGreaterThan(0);
    expect(analysis.faults.length).toBeGreaterThan(0);
    expect(analysis.cues).toHaveLength(3);
    expect(analysis.cues[0].title).toMatch(/^1\. /);
  });

  it("calls out the out-to-in path, which every club in the fixture shows", () => {
    expect(analysis.cues.some((c) => /right field/.test(c.title))).toBe(true);
  });

  it("gives the sand wedge a short-game badge and no benchmark pills", () => {
    const wedge = analysis.clubs.find((c) => c.clubName === "Sand Wedge")!;
    expect(wedge.badge).toEqual({ text: "short game", tone: "info" });
    expect(wedge.smashPills).toEqual([]);
    expect(wedge.bars).toEqual([]);
  });

  it("builds benchmark pills with the user's own value slotted in", () => {
    const seven = analysis.clubs.find((c) => c.clubName === "7 Iron")!;
    expect(seven.smashPills.some((p) => p.isUser)).toBe(true);
    expect(seven.smashPills.filter((p) => !p.isUser)).toHaveLength(3);
    // Pills stay in ascending order of standard.
    const orders = seven.smashPills.map((p) => p.sortOrder);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it("omits comparison content on a first session", () => {
    const first = buildAnalysis({
      shots: s1shots, sessionDate: "2026-03-17", benchmarks: BENCHMARKS,
      userHandicap: null, previous: null,
    });
    expect(first.previous).toBeNull();
    expect(first.comparisons).toEqual([]);
    expect(first.improvements).toEqual([]);
    expect(first.cues).toHaveLength(3);
  });
});
